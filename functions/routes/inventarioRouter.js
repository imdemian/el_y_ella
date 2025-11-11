// routers/inventario.router.js
import express from "express";
import admin from "firebase-admin";
import { db } from "../admin.js";

const router = express.Router();
const { FieldValue } = admin.firestore;

// Colecciones
const storesCol = db.collection("tiendas");
const invAggCol = db.collection("inventoryAgg");
const invIdxCol = db.collection("inventoryIndex");
const productsCol = db.collection("productos");

// Utils
const toStr = (v) => (v == null ? "" : String(v));
const norm = (s) => toStr(s).trim();
const lower = (s) => norm(s).toLowerCase();
const upper = (s) => norm(s).toUpperCase();

async function getProductAndVariant(productId, variantId) {
  const prodSnap = await productsCol.doc(productId).get();
  if (!prodSnap.exists) throw new Error("Producto no encontrado");
  const prod = prodSnap.data();
  const variant = (prod.variantes || []).find((v) => v.id === variantId);
  if (!variant) throw new Error("Variante no encontrada en producto");
  return { prod, variant };
}

function upsertInventoryIndicesTx(
  tx,
  { storeId, productId, prod, variant, oldStock, newStock, newMin }
) {
  const now = new Date();
  const delta = Number(newStock) - Number(oldStock || 0);

  // inventoryAgg/{variantId} (agregado global)
  const aggRef = invAggCol.doc(variant.id);
  tx.set(
    aggRef,
    {
      productId,
      variantId: variant.id,
      sku: norm(variant.sku || "") || null,
      barcode: upper(variant.barcode || "") || null,
      attrs: variant.atributos || {},

      // Denormalizados para UI/filtros
      productName: toStr(prod.nombre || ""),
      productNameLower: toStr(prod.nombreLower || ""),
      category: toStr(prod.categoria || ""),
      categoryId: prod.categoriaId || null,
      categoryLower: toStr(prod.categoriaLower || ""),

      totalStock: FieldValue.increment(delta),
      stores: {
        [storeId]: { stock: newStock, min: newMin, updatedAt: now },
      },
      updatedAt: now,
    },
    { merge: true }
  );

  // inventoryIndex/{variantId}_{storeId} (vista por tienda)
  const idxRef = invIdxCol.doc(`${variant.id}_${storeId}`);
  const isLowStock = Number(newStock) <= Number(newMin || 0);
  tx.set(
    idxRef,
    {
      variantId: variant.id,
      productId,
      storeId,
      stock: newStock,
      min: newMin,
      isLowStock,

      // Denormalizados para UI/filtros
      sku: norm(variant.sku || "") || null,
      barcode: upper(variant.barcode || "") || null,
      productName: toStr(prod.nombre || ""),
      productNameLower: toStr(prod.nombreLower || ""),
      category: toStr(prod.categoria || ""),
      categoryId: prod.categoriaId || null,
      categoryLower: toStr(prod.categoriaLower || ""),
      updatedAt: now,
    },
    { merge: true }
  );
}

function addStoreLogTx(tx, { storeId, payload }) {
  const logRef = storesCol.doc(storeId).collection("inventarioLogs").doc();
  tx.set(logRef, payload);
}

async function getStartAfterSnap(refCol, startAfterId) {
  if (!startAfterId) return null;
  const snap = await refCol.doc(startAfterId).get();
  return snap.exists ? snap : null;
}

/* ======================= LECTURAS ======================= */

/**
 * GET /inventario/global
 * ?limit,&startAfter,&q,&categoryId,&sku,&barcode,&variantId,&includeStores=1
 */
router.get("/global", async (req, res) => {
  try {
    const {
      limit = 50,
      startAfter,
      q = "",
      categoryId = "",
      sku = "",
      barcode = "",
      variantId = "",
      includeStores = "0",
    } = req.query;

    let ref = invAggCol;
    let usesRange = false;

    if (variantId) ref = ref.where("variantId", "==", variantId);
    if (sku) ref = ref.where("sku", "==", norm(sku));
    if (barcode) ref = ref.where("barcode", "==", upper(barcode));
    if (categoryId) ref = ref.where("categoryId", "==", categoryId);

    const qLower = lower(q);
    if (qLower) {
      ref = ref
        .where("productNameLower", ">=", qLower)
        .where("productNameLower", "<=", qLower + "\uf8ff")
        .orderBy("productNameLower");
      usesRange = true;
    }
    if (!usesRange) ref = ref.orderBy("updatedAt", "desc");

    const startSnap = await getStartAfterSnap(invAggCol, startAfter);
    if (startSnap) ref = ref.startAfter(startSnap);

    const snap = await ref.limit(Number(limit)).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (includeStores !== "1") {
      items = items.map(({ stores, ...rest }) => rest);
    }

    const nextStartAfter = snap.docs.length
      ? snap.docs[snap.docs.length - 1].id
      : null;

    res.json({ success: true, items, nextStartAfter });
  } catch (e) {
    console.error("Error GET /inventario/global:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /inventario/tienda
 * ?storeId,&limit,&startAfter,&q,&categoryId,&lowStock=1,&sku,&barcode,&variantId
 */
router.get("/tienda", async (req, res) => {
  try {
    const {
      storeId,
      limit = 50,
      startAfter,
      q = "",
      categoryId = "",
      lowStock = "0",
      sku = "",
      barcode = "",
      variantId = "",
    } = req.query;

    if (!storeId) {
      return res
        .status(400)
        .json({ success: false, message: "storeId es requerido" });
    }

    let ref = invIdxCol.where("storeId", "==", storeId);
    let usesRange = false;

    if (variantId) ref = ref.where("variantId", "==", variantId);
    if (sku) ref = ref.where("sku", "==", norm(sku));
    if (barcode) ref = ref.where("barcode", "==", upper(barcode));
    if (categoryId) ref = ref.where("categoryId", "==", categoryId);
    if (lowStock === "1") ref = ref.where("isLowStock", "==", true);

    const qLower = lower(q);
    if (qLower) {
      ref = ref
        .where("productNameLower", ">=", qLower)
        .where("productNameLower", "<=", qLower + "\uf8ff")
        .orderBy("productNameLower");
      usesRange = true;
    }
    if (!usesRange) ref = ref.orderBy("updatedAt", "desc");

    const startSnap = await getStartAfterSnap(invIdxCol, startAfter);
    if (startSnap) ref = ref.startAfter(startSnap);

    const snap = await ref.limit(Number(limit)).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const nextStartAfter = snap.docs.length
      ? snap.docs[snap.docs.length - 1].id
      : null;

    res.json({ success: true, items, nextStartAfter });
  } catch (e) {
    console.error("Error GET /inventario/tienda:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /inventario/producto/:productId        (AGREGADO global por producto)
 * ?limit,&startAfter,&includeStores=1
 */
router.get("/producto/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = Number(req.query.limit || 50);
    const startAfterId = req.query.startAfter || null;
    const includeStores = req.query.includeStores === "1";

    let ref = invAggCol
      .where("productId", "==", productId)
      .orderBy("updatedAt", "desc");

    if (startAfterId) {
      const lastSnap = await invAggCol.doc(startAfterId).get();
      if (lastSnap.exists) ref = ref.startAfter(lastSnap);
    }

    const snap = await ref.limit(limit).get();
    const items = snap.docs.map((d) => {
      const data = d.data() || {};
      if (!includeStores) {
        const { stores, ...rest } = data;
        return { id: d.id, ...rest };
      }
      return { id: d.id, ...data };
    });

    const next = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;
    return res.json({ success: true, items, next });
  } catch (e) {
    console.error("Error inventario por producto (global):", e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /inventario/tienda/producto/:productId (ÍNDICE por tienda de ese producto)
 * ?storeId=...,&limit,&startAfter,&lowStock=1
 */
router.get("/tienda/producto/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const storeId = req.query.storeId;
    if (!storeId) {
      return res
        .status(400)
        .json({ success: false, message: "storeId es requerido" });
    }

    const limit = Number(req.query.limit || 50);
    const startAfterId = req.query.startAfter || null;
    const lowStock = req.query.lowStock === "1";

    let ref = invIdxCol
      .where("productId", "==", productId)
      .where("storeId", "==", storeId);

    if (lowStock) ref = ref.where("isLowStock", "==", true);
    ref = ref.orderBy("updatedAt", "desc");

    if (startAfterId) {
      const lastSnap = await invIdxCol.doc(startAfterId).get();
      if (lastSnap.exists) ref = ref.startAfter(lastSnap);
    }

    const snap = await ref.limit(limit).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const next = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;

    return res.json({ success: true, items, next });
  } catch (e) {
    console.error("Error inventario por producto (tienda):", e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /inventario/variante/:variantId  (ficha agregada puntual)
 */
router.get("/variante/:variantId", async (req, res) => {
  try {
    const snap = await invAggCol.doc(req.params.variantId).get();
    if (!snap.exists)
      return res.status(404).json({ success: false, message: "No encontrado" });
    res.json({ success: true, id: snap.id, ...snap.data() });
  } catch (e) {
    console.error("Error GET /inventario/variante/:variantId:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ======================= ESCRITURAS ======================= */

/**
 * POST /inventario/transfer
 * { productId, variantId, fromStoreId, toStoreId, quantity, motivo? }
 */
router.post("/transfer", async (req, res) => {
  try {
    const {
      productId,
      variantId,
      fromStoreId,
      toStoreId,
      quantity,
      motivo = "transferencia",
    } = req.body;

    const qty = Number(quantity);
    if (!productId || !variantId || !fromStoreId || !toStoreId || !qty) {
      return res.status(400).json({
        success: false,
        message:
          "productId, variantId, fromStoreId, toStoreId y quantity son requeridos",
      });
    }
    if (fromStoreId === toStoreId)
      return res
        .status(400)
        .json({ success: false, message: "Las tiendas deben ser distintas" });
    if (qty <= 0)
      return res
        .status(400)
        .json({ success: false, message: "quantity debe ser > 0" });

    const { prod, variant } = await getProductAndVariant(productId, variantId);

    const fromRef = storesCol
      .doc(fromStoreId)
      .collection("inventario")
      .doc(variantId);
    const toRef = storesCol
      .doc(toStoreId)
      .collection("inventario")
      .doc(variantId);

    const correlationId = db.collection("_").doc().id;
    const now = new Date();

    await db.runTransaction(async (tx) => {
      const [fromSnap, toSnap] = await Promise.all([
        tx.get(fromRef),
        tx.get(toRef),
      ]);
      const fromPrev = fromSnap.exists
        ? fromSnap.data()
        : { stock: 0, minimoStock: 0 };
      const toPrev = toSnap.exists
        ? toSnap.data()
        : { stock: 0, minimoStock: 0 };

      if (Number(fromPrev.stock) < qty) {
        throw new Error("Stock insuficiente en tienda origen");
      }

      const fromNewStock = Number(fromPrev.stock) - qty;
      const toNewStock = Number(toPrev.stock) + qty;

      // Fuente de verdad por tienda
      tx.set(
        fromRef,
        {
          productoId: productId,
          varianteId: variantId,
          stock: fromNewStock,
          minimoStock: Number(fromPrev.minimoStock || 0),
          updatedAt: now,
        },
        { merge: true }
      );
      tx.set(
        toRef,
        {
          productoId: productId,
          varianteId: variantId,
          stock: toNewStock,
          minimoStock: Number(toPrev.minimoStock || 0),
          updatedAt: now,
        },
        { merge: true }
      );

      // Índices/agg
      upsertInventoryIndicesTx(tx, {
        storeId: fromStoreId,
        productId,
        prod,
        variant,
        oldStock: fromPrev.stock || 0,
        newStock: fromNewStock,
        newMin: Number(fromPrev.minimoStock || 0),
      });
      upsertInventoryIndicesTx(tx, {
        storeId: toStoreId,
        productId,
        prod,
        variant,
        oldStock: toPrev.stock || 0,
        newStock: toNewStock,
        newMin: Number(toPrev.minimoStock || 0),
      });

      // Logs
      addStoreLogTx(tx, {
        storeId: fromStoreId,
        payload: {
          timestamp: now,
          tipoOperacion: "transfer_out",
          correlacion: correlationId,
          varianteId: variantId,
          productoId: productId,
          cantidad: qty,
          stockPrevio: fromPrev.stock,
          stockNuevo: fromNewStock,
          motivo,
        },
      });
      addStoreLogTx(tx, {
        storeId: toStoreId,
        payload: {
          timestamp: now,
          tipoOperacion: "transfer_in",
          correlacion: correlationId,
          varianteId: variantId,
          productoId: productId,
          cantidad: qty,
          stockPrevio: toPrev.stock,
          stockNuevo: toNewStock,
          motivo,
        },
      });
    });

    res.json({ success: true, message: "Transferencia realizada" });
  } catch (e) {
    console.error("Error POST /inventario/transfer:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PUT /inventario/tiendas/:storeId/variantes/:variantId
 * Body: { productId, stock, minimoStock }
 */
router.put("/tiendas/:storeId/variantes/:variantId", async (req, res) => {
  try {
    const { storeId, variantId } = req.params;
    const { productId, stock, minimoStock } = req.body;

    if (!productId || stock == null || minimoStock == null) {
      return res.status(400).json({
        success: false,
        message: "productId, stock y minimoStock son requeridos",
      });
    }

    const { prod, variant } = await getProductAndVariant(productId, variantId);
    const invRef = storesCol
      .doc(storeId)
      .collection("inventario")
      .doc(variantId);

    await db.runTransaction(async (tx) => {
      const prevSnap = await tx.get(invRef);
      const prev = prevSnap.exists
        ? prevSnap.data()
        : { stock: 0, minimoStock: 0 };

      const newStock = Number(stock);
      const newMin = Number(minimoStock);
      const now = new Date();

      // Fuente de verdad por tienda
      tx.set(
        invRef,
        {
          productoId: productId,
          varianteId: variantId,
          stock: newStock,
          minimoStock: newMin,
          updatedAt: now,
        },
        { merge: true }
      );

      // Índices/agg
      upsertInventoryIndicesTx(tx, {
        storeId,
        productId,
        prod,
        variant,
        oldStock: Number(prev.stock || 0),
        newStock,
        newMin,
      });

      // Log
      addStoreLogTx(tx, {
        storeId,
        payload: {
          timestamp: now,
          tipoOperacion: "set_stock",
          varianteId: variantId,
          productoId: productId,
          stockPrevio: prev.stock || 0,
          stockNuevo: newStock,
          minimoPrevio: prev.minimoStock || 0,
          minimoNuevo: newMin,
        },
      });
    });

    res.json({ success: true, message: "Inventario actualizado" });
  } catch (e) {
    console.error(
      "Error PUT /inventario/tiendas/:storeId/variantes/:variantId:",
      e
    );
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /inventario/distribucion/:variantId
 * Obtener distribución de una variante por tiendas
 */
router.get("/distribucion/:variantId", async (req, res) => {
  try {
    const { variantId } = req.params;

    // Obtener el documento agregado de la variante
    const aggSnap = await invAggCol.doc(variantId).get();

    if (!aggSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada en inventario",
      });
    }

    const aggData = aggSnap.data();
    const storesMap = aggData.stores || {};

    // Obtener nombres de tiendas
    const storeIds = Object.keys(storesMap);
    const distribucion = [];

    for (const storeId of storeIds) {
      const storeSnap = await storesCol.doc(storeId).get();
      const storeData = storeSnap.exists ? storeSnap.data() : {};
      const storeName = storeData.nombre || "Tienda sin nombre";

      const storeInfo = storesMap[storeId];

      distribucion.push({
        tienda_id: storeId,
        tienda_nombre: storeName,
        stock: storeInfo.stock || 0,
        stock_minimo: storeInfo.min || 0,
        ultima_actualizacion: storeInfo.updatedAt || null,
      });
    }

    // Ordenar por stock descendente
    distribucion.sort((a, b) => b.stock - a.stock);

    res.json({
      success: true,
      data: distribucion,
      variante: {
        id: variantId,
        sku: aggData.sku,
        productName: aggData.productName,
        totalStock: aggData.totalStock || 0,
      },
    });
  } catch (e) {
    console.error("❌ Error al obtener distribución:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /inventario/crear
 * Crear inventario inicial para una variante en una tienda
 */
router.post("/crear", async (req, res) => {
  try {
    const { tienda_id, variante_id, stock_inicial, stock_minimo, motivo } =
      req.body;

    // Validaciones
    if (!tienda_id || !variante_id) {
      return res.status(400).json({
        success: false,
        message: "tienda_id y variante_id son requeridos",
      });
    }

    if (stock_inicial == null || stock_inicial < 0) {
      return res.status(400).json({
        success: false,
        message: "stock_inicial debe ser mayor o igual a 0",
      });
    }

    // Verificar que la tienda existe
    const storeSnap = await storesCol.doc(tienda_id).get();
    if (!storeSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "Tienda no encontrada",
      });
    }

    // Verificar que la variante existe en algún producto
    const productsSnap = await productsCol.get();
    let foundProduct = null;
    let foundVariant = null;

    for (const doc of productsSnap.docs) {
      const prod = doc.data();
      const variant = (prod.variantes || []).find((v) => v.id === variante_id);
      if (variant) {
        foundProduct = { id: doc.id, ...prod };
        foundVariant = variant;
        break;
      }
    }

    if (!foundProduct || !foundVariant) {
      return res.status(404).json({
        success: false,
        message: "Variante no encontrada",
      });
    }

    // Verificar si ya existe inventario para esta variante en esta tienda
    const existingIdx = await invIdxCol
      .doc(`${variante_id}_${tienda_id}`)
      .get();
    if (existingIdx.exists) {
      return res.status(400).json({
        success: false,
        message: "Ya existe inventario para esta variante en esta tienda",
      });
    }

    // Crear inventario en transacción
    await db.runTransaction(async (tx) => {
      const now = new Date();

      // Actualizar índices de inventario
      upsertInventoryIndicesTx(tx, {
        storeId: tienda_id,
        productId: foundProduct.id,
        prod: foundProduct,
        variant: foundVariant,
        oldStock: 0,
        newStock: stock_inicial,
        newMin: stock_minimo || 0,
      });

      // Registrar log de creación
      if (stock_inicial > 0) {
        addStoreLogTx(tx, {
          storeId: tienda_id,
          payload: {
            type: "entrada",
            variantId: variante_id,
            productId: foundProduct.id,
            quantity: stock_inicial,
            reason: motivo || "Inventario inicial",
            userId: req.user?.uid || "system",
            userName: req.user?.email || "Sistema",
            timestamp: now,
            oldStock: 0,
            newStock: stock_inicial,
          },
        });
      }
    });

    res.json({
      success: true,
      message: "Inventario creado exitosamente",
      data: {
        tienda_id,
        variante_id,
        stock: stock_inicial,
        stock_minimo: stock_minimo || 0,
      },
    });
  } catch (e) {
    console.error("❌ Error al crear inventario:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
