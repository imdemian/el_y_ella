import express from "express";
import { db } from "../admin.js";

const router = express.Router();
const productsCol = db.collection("productos");
const barcodesCol = db.collection("barcodes");

// -------------------- Helpers --------------------
const toStr = (v) => (v == null ? "" : String(v));
const norm = (s) => toStr(s).trim();
const upper = (s) => norm(s).toUpperCase();
const lower = (s) => norm(s).toLowerCase();

function sanitizeVariantes(variantes = [], precioBase = 0) {
  if (!Array.isArray(variantes)) return [];
  const seenIds = new Set();
  const seenCombos = new Set(); // para evitar atributos duplicados

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
    // llave determinística de atributos para evitar combinaciones repetidas
    const key = JSON.stringify(
      Object.entries(attrs)
        .map(([k, val]) => [norm(k), norm(val)])
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
  // Crea/actualiza índice global barcodes/{CODE} -> { productId, variantId }
  const prevMap = new Map(
    prev.filter((v) => v.barcode).map((v) => [upper(v.barcode), v])
  );
  const nextMap = new Map(
    (nuevas || []).filter((v) => v.barcode).map((v) => [upper(v.barcode), v])
  );

  // duplicates dentro del payload
  if (nextMap.size !== (nuevas || []).filter((v) => v.barcode).length) {
    throw new Error("Barcode duplicado en el payload.");
  }

  // validar que no existe en otro producto
  for (const [code, v] of nextMap) {
    const doc = await barcodesCol.doc(code).get();
    if (doc.exists) {
      const data = doc.data();
      // si existe en otro producto → error
      if (data.productId !== productId) {
        throw new Error(`El barcode ${code} ya está asignado a otro producto.`);
      }
      // si existe en el mismo producto pero a otra variante → también error
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
    if (!nextMap.has(code)) {
      batch.delete(barcodesCol.doc(code));
    }
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

// -------------------- Crear producto --------------------
router.post("/", async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      categoria, // nombre de categoría
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
      categoria, // nombre
      categoriaLower,
      categoriaId: categoriaId || null, // id
      precioBase,
      imagenes: imagenes || [],
      tieneVariantes: !!tieneVariantes,
      variantes: cleanVariantes,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await productsCol.add(data);
    await syncBarcodes(docRef.id, cleanVariantes, []);
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
    const limit = Number(req.query.limit || 20);
    const startAfterId = req.query.startAfter || null;
    const mode = req.query.mode || "full"; // "full" | "slim"

    let ref = productsCol.orderBy("createdAt", "desc");
    if (startAfterId) {
      const lastSnap = await productsCol.doc(startAfterId).get();
      if (lastSnap.exists) {
        ref = ref.startAfter(lastSnap);
      }
    }

    const snap = await ref.limit(limit).get();
    let productos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (mode === "slim") {
      // no enviar variantes para payload más ligero
      productos = productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
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

// -------------------- Búsqueda server-side --------------------
router.get("/search", async (req, res) => {
  try {
    const q = lower(req.query.q || "");
    const categoriaId = req.query.categoriaId || "";
    const limit = Number(req.query.limit || 20);
    const startAfterId = req.query.startAfter || null;

    let ref = productsCol;

    if (q) {
      // búsqueda por prefijo en nombreLower
      ref = ref
        .where("nombreLower", ">=", q)
        .where("nombreLower", "<=", q + "\uf8ff");
    }

    if (categoriaId) {
      ref = ref.where("categoriaId", "==", categoriaId);
    }

    ref = ref.orderBy("nombreLower");

    if (startAfterId) {
      const lastSnap = await productsCol.doc(startAfterId).get();
      if (lastSnap.exists) {
        ref = ref.startAfter(lastSnap);
      }
    }

    const snap = await ref.limit(limit).get();
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      variantes: undefined, // no devolvemos variantes en search
    }));

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
    if (!code)
      return res
        .status(400)
        .json({ success: false, message: "Barcode requerido" });

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

// -------------------- Actualizar producto (incluye variantes + barcodes) --------------------
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
    await syncBarcodes(docRef.id, cleanVariantes, prev?.variantes || []);

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

// -------------------- Eliminar producto (limpia barcodes) --------------------
router.delete("/:id", async (req, res) => {
  try {
    const docRef = productsCol.doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }
    const data = docSnap.data();

    // limpia barcodes
    const batch = db.batch();
    for (const v of data.variantes || []) {
      if (v.barcode) batch.delete(barcodesCol.doc(upper(v.barcode)));
    }
    batch.delete(docRef);
    await batch.commit();

    return res
      .status(200)
      .json({ success: true, message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando producto:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
      error: error.message,
    });
  }
});

export default router;
