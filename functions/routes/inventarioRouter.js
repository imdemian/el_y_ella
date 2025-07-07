import express from "express";
import { db } from "../firebase.js";
const router = express.Router();

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
router.post("/tiendas/:tiendaId/inventario", async (req, res) => {
  try {
    const { tiendaId } = req.params;
    const { productoId, varianteId, cantidad = 0, minimoStock = 1 } = req.body;
    if (!productoId || !varianteId) {
      return res
        .status(400)
        .json({
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
    return res
      .status(500)
      .json({
        success: false,
        message: "Error al agregar inventario",
        error: error.message,
      });
  }
});

/**
 * PUT /api/tiendas/:tiendaId/inventario/:invId
 * Actualiza stock y mínimo, registra log
 */
router.put("/tiendas/:tiendaId/inventario/:invId", async (req, res) => {
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
    return res
      .status(500)
      .json({
        success: false,
        message: "Error al actualizar inventario",
        error: error.message,
      });
  }
});

/**
 * GET /api/tiendas/:tiendaId/inventario
 * ?productoId=...
 */
router.get("/tiendas/:tiendaId/inventario", async (req, res) => {
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
    return res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener inventario",
        error: error.message,
      });
  }
});

/**
 * GET /api/tiendas/:tiendaId/logs_inventario
 */
router.get("/tiendas/:tiendaId/logs_inventario", async (req, res) => {
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
    return res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener logs",
        error: error.message,
      });
  }
});

export default router;
