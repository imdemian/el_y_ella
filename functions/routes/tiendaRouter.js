// functions/routes/tiendasRouter.js
import express from "express";
import { db } from "../admin.js";

const router = express.Router();
const collection = db.collection("tiendas");

// Crear una nueva tienda
router.post("/", async (req, res) => {
  try {
    const { nombre, direccion = "", ...otrosCampos } = req.body;
    if (!nombre) {
      return res
        .status(400)
        .json({ success: false, message: "El nombre es obligatorio" });
    }
    const now = new Date();
    const data = {
      nombre,
      direccion,
      ...otrosCampos,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await collection.add(data);
    const snap = await docRef.get();
    return res.status(201).json({ id: snap.id, ...snap.data() });
  } catch (error) {
    console.error("Error registrando tienda:", error);
    return res.status(500).json({
      success: false,
      message: "Error al registrar la tienda",
      error: error.message,
    });
  }
});

// Listar todas las tiendas
router.get("/", async (_req, res) => {
  try {
    const snap = await collection.get();
    const tiendas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json(tiendas);
  } catch (error) {
    console.error("Error obteniendo tiendas:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener la lista de tiendas",
      error: error.message,
    });
  }
});

// Obtener una tienda por ID
router.get("/:id", async (req, res) => {
  try {
    const snap = await collection.doc(req.params.id).get();
    if (!snap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Tienda no encontrada" });
    }
    return res.status(200).json({ id: snap.id, ...snap.data() });
  } catch (error) {
    console.error("Error obteniendo tienda:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener la tienda",
      error: error.message,
    });
  }
});

// Actualizar una tienda por ID
router.put("/:id", async (req, res) => {
  try {
    const { nombre, direccion = "", ...otrosCampos } = req.body;
    if (!nombre) {
      return res
        .status(400)
        .json({ success: false, message: "El nombre es obligatorio" });
    }
    const docRef = collection.doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Tienda no encontrada" });
    }
    const updatedData = {
      nombre,
      direccion,
      ...otrosCampos,
      updatedAt: new Date(),
    };
    await docRef.update(updatedData);
    const updatedSnap = await docRef.get();
    return res.status(200).json({ id: updatedSnap.id, ...updatedSnap.data() });
  } catch (error) {
    console.error("Error actualizando tienda:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar la tienda",
      error: error.message,
    });
  }
});

// Eliminar una tienda por ID
router.delete("/:id", async (req, res) => {
  try {
    const docRef = collection.doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Tienda no encontrada" });
    }
    await docRef.delete();
    return res
      .status(200)
      .json({ success: true, message: "Tienda eliminada exitosamente" });
  } catch (error) {
    console.error("Error eliminando tienda:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar la tienda",
      error: error.message,
    });
  }
});

/** Helper para escribir logs en subcolección */
const logOperacion = async ({
  tiendaId,
  inventarioId,
  productoId,
  varianteId,
  anterior,
  nueva,
  tipo, // 'CREAR' | 'ACTUALIZAR'
  usuario = "sistema",
}) => {
  const logRef = db
    .collection("tiendas")
    .doc(tiendaId)
    .collection("logs_inventario")
    .doc();
  await logRef.set({
    tipoOperacion: tipo,
    inventarioId,
    productoId,
    varianteId,
    cambio: { anterior, nueva },
    usuario,
    timestamp: new Date(),
  });
};

/**
 * POST /api/tiendas/:tiendaId/inventario
 */
router.post("/:tiendaId/inventario", async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const { productoId, varianteId, cantidad = 0, minimoStock = 1 } = req.body;
    if (!productoId || !varianteId) {
      return res.status(400).json({
        success: false,
        message: "productoId y varianteId son requeridos",
      });
    }
    const now = new Date();
    const invRef = db
      .collection("tiendas")
      .doc(tiendaId)
      .collection("inventario")
      .doc();
    await invRef.set({
      productoId,
      varianteId,
      stock: cantidad,
      minimoStock,
      createdAt: now,
      updatedAt: now,
    });

    // Log
    await logOperacion({
      tiendaId,
      inventarioId: invRef.id,
      productoId,
      varianteId,
      anterior: 0,
      nueva: cantidad,
      tipo: "CREAR",
      usuario: req.user?.uid,
    });

    return res.status(201).json({ success: true, id: invRef.id });
  } catch (error) {
    console.error("Error agregando inventario:", error);
    return res.status(500).json({
      success: false,
      message: "Error al agregar inventario",
      error: error.message,
    });
  }
});

/**
 * PUT /api/:tiendaId/inventario/:invId
 * Actualiza stock y mínimo, registra log
 */
router.put("/:tiendaId/inventario/:invId", async (req, res) => {
  try {
    const { tiendaId, invId } = req.params;
    const { stock, minimoStock } = req.body;
    const now = new Date();
    const invRef = db
      .collection("tiendas")
      .doc(tiendaId)
      .collection("inventario")
      .doc(invId);
    const snap = await invRef.get();
    if (!snap.exists)
      return res
        .status(404)
        .json({ success: false, message: "Inventario no encontrado" });
    const anterior = snap.data().stock;
    await invRef.update({ stock, minimoStock, updatedAt: now });

    // Log
    await logOperacion({
      tiendaId,
      inventarioId: invId,
      productoId: snap.data().productoId,
      varianteId: snap.data().varianteId,
      anterior,
      nueva: stock,
      tipo: "ACTUALIZAR",
      usuario: req.user?.uid,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error actualizando inventario:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar inventario",
      error: error.message,
    });
  }
});

/**
 * GET /api/:tiendaId/inventario
 * ?productoId=...
 */
router.get("/:tiendaId/inventario", async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const { productoId } = req.query;
    let ref = db.collection("tiendas").doc(tiendaId).collection("inventario");
    if (productoId) ref = ref.where("productoId", "==", productoId);
    const snap = await ref.get();
    const inventario = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, inventario });
  } catch (error) {
    console.error("Error obteniendo inventario:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener inventario",
      error: error.message,
    });
  }
});

/**
 * GET /api/:tiendaId/logs_inventario
 */
router.get("/:tiendaId/logs_inventario", async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const snap = await db
      .collection("tiendas")
      .doc(tiendaId)
      .collection("logs_inventario")
      .orderBy("timestamp", "desc")
      .get();
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, logs });
  } catch (error) {
    console.error("Error obteniendo logs de inventario:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener logs",
      error: error.message,
    });
  }
});

export default router;
