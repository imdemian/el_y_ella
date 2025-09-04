// routers/productos.router.js
import express from "express";
import { db } from "../admin.js";

const router = express.Router();

// Colecciones
const productsCol = db.collection("productos");
const barcodesCol = db.collection("barcodes");
const skusCol = db.collection("skus");
const invAggCol = db.collection("inventoryAgg");
const invIdxCol = db.collection("inventoryIndex");

// -------------------- Helpers --------------------
const toStr = (v) => (v == null ? "" : String(v));
const norm = (s) => toStr(s).trim();
const upper = (s) => norm(s).toUpperCase();
const lower = (s) => norm(s).toLowerCase();

function sanitizeVariantes(variantes = [], precioBase = 0) {
  if (!Array.isArray(variantes)) return [];
  const seenIds = new Set();
  const seenCombos = new Set(); // evitar combos duplicados

  const clean = variantes.map((v) => {
    const id = norm(v.id);
    if (!id) throw new Error("Cada variante debe incluir un id estable.");
    if (seenIds.has(id)) throw new Error(`ID de variante duplicado: ${id}`);
    seenIds.add(id);

    const precio = Number(v.precio ?? precioBase);
    if (Number.isNaN(precio) || precio < 0) {
      throw new Error(`Precio inválido en variante ${id}`);
    }

    const attrs = v.atributos || {};
    const key = JSON.stringify(
      Object.entries(attrs)
        .map(([k, val]) => [lower(k), norm(val)])
        .sort(([a], [b]) => a.localeCompare(b))
    );
    if (seenCombos.has(key)) {
      throw new Error(`Combinación de atributos duplicada en variante ${id}`);
    }
    seenCombos.add(key);

    const sku = norm(v.sku || "");
    const barcode = upper(v.barcode || ""); // guardamos uppercase

    return {
      id,
      sku: sku || null,
      barcode: barcode || null,
      precio,
      atributos: attrs,
    };
  });

  return clean;
}

async function syncBarcodes(productId, nuevas = [], prev = []) {
  const prevMap = new Map(
    (prev || []).filter((v) => v.barcode).map((v) => [upper(v.barcode), v])
  );
  const nextMap = new Map(
    (nuevas || []).filter((v) => v.barcode).map((v) => [upper(v.barcode), v])
  );

  // Duplicados dentro del payload
  if (nextMap.size !== (nuevas || []).filter((v) => v.barcode).length) {
    throw new Error("Barcode duplicado en el payload.");
  }

  // Validar que no exista en otro producto/variante
  for (const [code, v] of nextMap) {
    const doc = await barcodesCol.doc(code).get();
    if (doc.exists) {
      const data = doc.data(); // { productId, variantId }
      if (data.productId !== productId) {
        throw new Error(`El barcode ${code} ya está asignado a otro producto.`);
      }
      if (data.productId === productId && data.variantId !== v.id) {
        throw new Error(
          `El barcode ${code} ya está asignado a otra variante (${data.variantId}) de este producto.`
        );
      }
    }
  }

  const batch = db.batch();

  // borrar barcodes eliminados
  for (const [code] of prevMap) {
    if (!nextMap.has(code)) batch.delete(barcodesCol.doc(code));
  }
  // upsert barcodes nuevos/actualizados
  for (const [code, v] of nextMap) {
    batch.set(
      barcodesCol.doc(code),
      { productId, variantId: v.id },
      { merge: true }
    );
  }

  await batch.commit();
}

async function syncSkus(productId, nuevas = [], prev = []) {
  const toMap = (arr) => {
    const m = new Map();
    for (const v of arr || []) {
      const sku = lower(v.sku || "");
      if (sku) m.set(sku, v);
    }
    return m;
  };

  const prevMap = toMap(prev);
  const nextMap = toMap(nuevas);

  // Duplicados en el payload
  if (nextMap.size !== (nuevas || []).filter((v) => norm(v?.sku)).length) {
    throw new Error("SKU duplicado en el payload.");
  }

  // Validar que no esté usado por otro producto/variante
  for (const [sku, v] of nextMap) {
    const doc = await skusCol.doc(sku).get();
    if (doc.exists) {
      const data = doc.data(); // { productId, variantId }
      if (data.productId !== productId || data.variantId !== v.id) {
        throw new Error(
          `El SKU ${sku} ya está asignado a otra variante/producto.`
        );
      }
    }
  }

  const batch = db.batch();

  // Borra los que ya no están
  for (const [sku] of prevMap) {
    if (!nextMap.has(sku)) batch.delete(skusCol.doc(sku));
  }

  // Upsert nuevos/actualizados
  for (const [sku, v] of nextMap) {
    batch.set(
      skusCol.doc(sku),
      { productId, variantId: v.id, skuLower: sku },
      { merge: true }
    );
  }

  await batch.commit();
}

// ---- helpers de borrado en lotes (sin while(true)) ----
async function deleteQueryInBatches(query, batchSize = 300) {
  let snap = await query.limit(batchSize).get();
  while (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    // vuelve a consultar lo restante
    snap = await query.limit(batchSize).get();
  }
}

async function purgeVariantFromInventory(variantId) {
  // 1) Agg global
  await invAggCol
    .doc(variantId)
    .delete()
    .catch(() => {});

  // 2) Índice por tienda
  const idxQuery = invIdxCol.where("variantId", "==", variantId);
  await deleteQueryInBatches(idxQuery);

  // 3) Documentos en tiendas/*/inventario (collectionGroup)
  const cgQuery = db
    .collectionGroup("inventario")
    .where("varianteId", "==", variantId);
  await deleteQueryInBatches(cgQuery);
}

// -------------------- Crear producto --------------------
router.post("/", async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      categoria, // nombre visible
      categoriaId, // id de categoría (opcional pero recomendado)
      precioBase,
      imagenes,
      tieneVariantes,
      variantes,
    } = req.body;

    if (!nombre || !categoria || precioBase == null) {
      return res.status(400).json({
        success: false,
        message: "El nombre, categoría y precioBase son requeridos",
      });
    }

    // Duplicado por nombre (opcional)
    const nameSnap = await productsCol.where("nombre", "==", nombre).get();
    if (!nameSnap.empty) {
      return res
        .status(400)
        .json({ success: false, message: "El producto ya existe" });
    }

    const now = new Date();
    const nombreLower = lower(nombre);
    const categoriaLower = lower(categoria);
    const cleanVariantes = sanitizeVariantes(variantes || [], precioBase);

    const data = {
      nombre,
      nombreLower,
      descripcion: descripcion || "",
      categoria, // nombre visible
      categoriaLower,
      categoriaId: categoriaId || null,
      precioBase,
      imagenes: imagenes || [],
      tieneVariantes: !!tieneVariantes,
      variantes: cleanVariantes,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await productsCol.add(data);

    await Promise.all([
      syncBarcodes(docRef.id, cleanVariantes, []),
      syncSkus(docRef.id, cleanVariantes, []),
    ]);

    const docSnap = await docRef.get();
    return res.status(201).json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error("Error creando producto:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear producto",
      error: error.message,
    });
  }
});

// -------------------- Listar productos (paginado + slim opcional) --------------------
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const startAfterId = req.query.startAfter || null;
    const mode = req.query.mode || "full"; // "full" | "slim"

    let ref = productsCol.orderBy("createdAt", "desc");
    if (startAfterId) {
      const lastSnap = await productsCol.doc(startAfterId).get();
      if (lastSnap.exists) ref = ref.startAfter(lastSnap);
    }

    const snap = await ref.limit(limit).get();
    let productos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (mode === "slim") {
      productos = productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoria: p.categoria,
        categoriaId: p.categoriaId || null,
        precioBase: p.precioBase,
        tieneVariantes: !!p.tieneVariantes,
        variantesCount: Array.isArray(p.variantes) ? p.variantes.length : 0,
        createdAt: p.createdAt,
      }));
    }

    const nextStartAfter = snap.docs.length
      ? snap.docs[snap.docs.length - 1].id
      : null;

    res.json({ success: true, productos, nextStartAfter });
  } catch (e) {
    console.error("Error listando productos:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// -------------------- Búsqueda server-side estable --------------------
router.get("/search", async (req, res) => {
  try {
    const q = lower(req.query.q || "");
    const categoriaId = (req.query.categoriaId || "").toString().trim();
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const startAfterId = (req.query.startAfter || "").toString().trim();

    let ref = productsCol;

    if (categoriaId) ref = ref.where("categoriaId", "==", categoriaId);

    if (q) {
      // prefijo por nombreLower
      ref = ref
        .where("nombreLower", ">=", q)
        .where("nombreLower", "<=", q + "\uf8ff");
    }

    // orden estable: nombreLower + id
    ref = ref.orderBy("nombreLower").orderBy("__name__");

    if (startAfterId) {
      const lastSnap = await productsCol.doc(startAfterId).get();
      if (lastSnap.exists) {
        const last = lastSnap.data();
        ref = ref.startAfter(last?.nombreLower || "", lastSnap.id);
      }
    }

    const snap = await ref.limit(limit).get();
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        nombre: data.nombre,
        categoriaId: data.categoriaId || null,
        categoria: data.categoria || null,
        precioBase: data.precioBase,
        imagenes: data.imagenes || [],
        variantesCount: Array.isArray(data.variantes)
          ? data.variantes.length
          : 0,
      };
    });

    const next = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;
    res.json({ success: true, items, next });
  } catch (e) {
    console.error("Error en búsqueda:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// -------------------- Lookup por barcode --------------------
router.get("/barcode/:code", async (req, res) => {
  try {
    const code = upper(req.params.code || "");
    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Barcode requerido" });
    }
    const doc = await barcodesCol.doc(code).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "No encontrado" });
    }
    return res.json({ success: true, ...doc.data(), code });
  } catch (e) {
    console.error("Error lookup barcode:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// -------------------- Lookup por SKU --------------------
router.get("/sku/:sku", async (req, res) => {
  try {
    const sku = lower(req.params.sku || "");
    if (!sku) {
      return res.status(400).json({ success: false, message: "SKU requerido" });
    }
    const doc = await skusCol.doc(sku).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "No encontrado" });
    }
    return res.json({ success: true, ...doc.data(), skuLower: sku });
  } catch (e) {
    console.error("Error lookup SKU:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// -------------------- Obtener producto por ID --------------------
router.get("/:id", async (req, res) => {
  try {
    const docSnap = await productsCol.doc(req.params.id).get();
    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }
    return res.status(200).json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error("Error obteniendo producto:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener producto",
      error: error.message,
    });
  }
});

// -------------------- Actualizar producto (variantes + barcodes + skus) --------------------
router.put("/:id", async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      categoria,
      categoriaId,
      precioBase,
      tieneVariantes,
      imagenes,
      variantes,
    } = req.body;

    if (!nombre || !categoria || precioBase == null) {
      return res.status(400).json({
        success: false,
        message: "El nombre, categoría y precioBase son requeridos",
      });
    }

    const docRef = productsCol.doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }

    // Verificar duplicado de nombre (excluyendo este ID)
    const nameSnap = await productsCol.where("nombre", "==", nombre).get();
    if (!nameSnap.empty && nameSnap.docs.some((d) => d.id !== req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Otro producto con ese nombre ya existe",
      });
    }

    const prev = docSnap.data();
    const nombreLower = lower(nombre);
    const categoriaLower = lower(categoria);
    const cleanVariantes = sanitizeVariantes(variantes || [], precioBase);

    const updatedData = {
      nombre,
      nombreLower,
      descripcion: descripcion || "",
      categoria,
      categoriaLower,
      categoriaId: categoriaId || null,
      precioBase,
      tieneVariantes: !!tieneVariantes,
      imagenes: imagenes || [],
      variantes: cleanVariantes,
      updatedAt: new Date(),
    };

    await docRef.update(updatedData);
    await Promise.all([
      syncBarcodes(docRef.id, cleanVariantes, prev?.variantes || []),
      syncSkus(docRef.id, cleanVariantes, prev?.variantes || []),
    ]);

    const updatedSnap = await docRef.get();
    return res.status(200).json({ id: updatedSnap.id, ...updatedSnap.data() });
  } catch (error) {
    console.error("Error actualizando producto:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
      error: error.message,
    });
  }
});

// -------------------- Eliminar producto (purga inventario + índices) --------------------
router.delete("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const force = String(req.query.force || "0") === "1"; // ?force=1 para forzar
    const docRef = productsCol.doc(productId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }

    const data = docSnap.data();
    const variantes = Array.isArray(data.variantes) ? data.variantes : [];

    // (A) Bloquear borrado si hay stock > 0 (a menos que ?force=1)
    const idxByProduct = await invIdxCol
      .where("productId", "==", productId)
      .get();
    const anyWithStock = idxByProduct.docs.some(
      (d) => Number(d.data()?.stock || 0) > 0
    );

    if (anyWithStock && !force) {
      return res.status(400).json({
        success: false,
        message:
          "Este producto tiene stock en una o más tiendas. " +
          "Mueve/ajusta stock antes de borrar, o usa ?force=1 para purgar el inventario relacionado.",
      });
    }

    // (B) Purga de inventario asociado (agg/index/tiendas/*/inventario)
    for (const v of variantes) {
      if (!v?.id) continue;
      await purgeVariantFromInventory(v.id);
    }

    // (C) Limpiar índices de códigos (barcodes/skus) y (D) eliminar el producto
    const batch = db.batch();
    for (const v of variantes) {
      if (v?.barcode) batch.delete(barcodesCol.doc(upper(v.barcode)));
      if (v?.sku) batch.delete(skusCol.doc(lower(v.sku)));
    }
    batch.delete(docRef);
    await batch.commit();

    return res.json({
      success: true,
      message: anyWithStock
        ? "Producto y todo su inventario asociado purgado (force=1)."
        : "Producto eliminado correctamente (sin stock).",
    });
  } catch (error) {
    console.error("Error eliminando producto con purga:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
      error: error.message,
    });
  }
});

export default router;
