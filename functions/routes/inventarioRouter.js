import express from "express";
import { db } from "../firebase.js";
const router = express.Router();

/**
 * POST /api/tiendas/:tiendaId/inventario
 * Agrega un producto (o variante) al inventario de una tienda específica
 * Body: { productoId, varianteId, cantidad, minimoStock }
 */
router.post("/tiendas/:tiendaId/inventario", async (req, res) => {
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

export default router;
