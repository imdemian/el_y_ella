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
    return res
      .status(500)
      .json({
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
    return res
      .status(500)
      .json({
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
    return res
      .status(500)
      .json({
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
    return res
      .status(500)
      .json({
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
    return res
      .status(500)
      .json({
        success: false,
        message: "Error al eliminar la tienda",
        error: error.message,
      });
  }
});

export default router;
