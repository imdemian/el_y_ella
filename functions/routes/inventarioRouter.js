// routers/inventario.router.js
import express from "express";
import admin from "firebase-admin";
import { db } from "../admin.js"; // Asegúrate que exportas db desde admin.js

const router = express.Router();
const { FieldValue } = admin.firestore;

// Referencias
const storesCol = db.collection("tiendas");
const invAggCol = db.collection("inventoryAgg");
const invIdxCol = db.collection("inventoryIndex");
const productsCol = db.collection("productos");

// -------------------- Utils --------------------
const toStr = (v) => (v == null ? "" : String(v));
const norm = (s) => toStr(s).trim();
const lower = (s) => norm(s).toLowerCase();
const upper = (s) => norm(s).toUpperCase();

/** Trae el producto y la variante; lanza error si no existen */
async function getProductAndVariant(productId, variantId) {
  const prodSnap = await productsCol.doc(productId).get();
  if (!prodSnap.exists) throw new Error("Producto no encontrado");
  const prod = prodSnap.data();
  const variant = (prod.variantes || []).find((v) => v.id === variantId);
  if (!variant) throw new Error("Variante no encontrada en producto");
  return { prod, variant };
}

/** Upsert de índices dentro de una transacción existente */
function upsertInventoryIndicesTx(
  tx,
  { storeId, productId, prod, variant, oldStock, newStock, newMin }
) {
  const now = new Date();
  const delta = Number(newStock) - Number(oldStock || 0);

  // --- inventoryAgg/{variantId} ---
  const aggRef = invAggCol.doc(variant.id);
  tx.set(
    aggRef,
    {
      productId,
      variantId: variant.id,
      sku: norm(variant.sku || "") || null,
      barcode: upper(variant.barcode || "") || null,
      attrs: variant.atributos || {},
      // Campos denormalizados para filtros globales
      productNameLower: toStr(prod.nombreLower || "").toString(),
      categoryId: prod.categoriaId || null,
      categoryLower: toStr(prod.categoriaLower || "").toString(),
      totalStock: FieldValue.increment(delta),
      stores: {
        [storeId]: { stock: newStock, min: newMin, updatedAt: now },
      },
      updatedAt: now,
    },
    { merge: true }
  );

  // --- inventoryIndex/{variantId}_{storeId} ---
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
      sku: norm(variant.sku || "") || null,
      barcode: upper(variant.barcode || "") || null,
      productNameLower: toStr(prod.nombreLower || "").toString(),
      categoryId: prod.categoriaId || null,
      categoryLower: toStr(prod.categoriaLower || "").toString(),
      updatedAt: now,
    },
    { merge: true }
  );
}

/** Escribe logs por tienda (opcional) */
function addStoreLogTx(tx, { storeId, payload }) {
  const logRef = storesCol.doc(storeId).collection("inventarioLogs").doc();
  tx.set(logRef, payload);
}

/** Devuelve un DocumentSnapshot para startAfter según colección/ref actual */
async function getStartAfterSnap(refCol, startAfterId) {
  if (!startAfterId) return null;
  const snap = await refCol.doc(startAfterId).get();
  return snap.exists ? snap : null;
}

// -------------------- Vistas de lectura --------------------

/**
 * GET /inventario/global
 * Params:
 *  - limit (default 50), startAfter
 *  - q (prefijo sobre productNameLower)
 *  - categoryId
 *  - sku, barcode, variantId (exactos)
 *  - includeStores=1 (para devolver el mapa stores completo)
 *
 * Notas:
 *  - Para q (range), ordena por productNameLower.
 *  - Para el resto, ordena por updatedAt desc.
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

    if (variantId) {
      ref = ref.where("variantId", "==", variantId);
    }
    if (sku) {
      ref = ref.where("sku", "==", norm(sku));
    }
    if (barcode) {
      ref = ref.where("barcode", "==", upper(barcode));
    }
    if (categoryId) {
      ref = ref.where("categoryId", "==", categoryId);
    }

    const qLower = lower(q);
    if (qLower) {
      // búsqueda por prefijo sobre productNameLower
      ref = ref
        .where("productNameLower", ">=", qLower)
        .where("productNameLower", "<=", qLower + "\uf8ff")
        .orderBy("productNameLower");
      usesRange = true;
    }

    if (!usesRange) {
      ref = ref.orderBy("updatedAt", "desc");
    }

    const startSnap = await getStartAfterSnap(invAggCol, startAfter);
    if (startSnap) ref = ref.startAfter(startSnap);

    const snap = await ref.limit(Number(limit)).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (includeStores !== "1") {
      // omitir el mapa de tiendas para payload ligero
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
 * Params:
 *  - storeId (requerido)
 *  - limit (default 50), startAfter
 *  - q (prefijo productNameLower)
 *  - categoryId
 *  - lowStock=1 (usa campo isLowStock en índice)
 *  - sku, barcode, variantId (exactos)
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

    if (!usesRange) {
      ref = ref.orderBy("updatedAt", "desc");
    }

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
 * GET /inventario/:variantId (agregado global puntual)
 */
router.get("/:variantId", async (req, res) => {
  try {
    const snap = await invAggCol.doc(req.params.variantId).get();
    if (!snap.exists)
      return res.status(404).json({ success: false, message: "No encontrado" });
    res.json({ success: true, id: snap.id, ...snap.data() });
  } catch (e) {
    console.error("Error GET /inventario/:variantId:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// -------------------- Escrituras (transferencias y set) --------------------

/**
 * POST /inventario/transfer
 * Body:
 *  - productId, variantId, fromStoreId, toStoreId, quantity, motivo (opcional)
 * Ajusta stock en ambas tiendas dentro de una transacción
 * y actualiza índices/agg + escribe logs por tienda.
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

    // Genera un id de correlación para los logs
    const correlationId = db.collection("_").doc().id;
    const now = new Date();

    await db.runTransaction(async (tx) => {
      // Leer estado previo
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

      // Escribir inventario por tienda (fuente de verdad)
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

      // Actualizar índices en la misma TX
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

      // Logs por tienda
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
 * Setea stock/min de UNA variante en UNA tienda
 * y actualiza los índices globales.
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

      // Índices
      upsertInventoryIndicesTx(tx, {
        storeId,
        productId,
        prod,
        variant,
        oldStock: Number(prev.stock || 0),
        newStock,
        newMin,
      });

      // Log opcional
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

// ================== INVENTARIO POR PRODUCTO (GLOBAL) ==================
// GET /inventario/producto/:productId
// Lista TODAS las variantes de ese producto, agregadas globalmente (inventoryAgg).
// Params opcionales: limit, startAfter, includeStores=1
router.get("/inventario/producto/:productId", async (req, res) => {
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

// ================== INVENTARIO POR PRODUCTO EN UNA TIENDA ==================
// GET /inventario/tienda/producto/:productId?storeId=...&limit=...&startAfter=...&lowStock=1
// Lista TODAS las variantes de ese producto pero SOLO para esa tienda (inventoryIndex).
router.get("/inventario/tienda/producto/:productId", async (req, res) => {
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

export default router;
