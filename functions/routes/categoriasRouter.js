import express from "express";
import { db } from "../admin.js";

const router = express.Router();
const categoriasCol = db.collection("categorias");

// Crear categoria
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "El nombre de la categoria es requerido",
      });
    }
    // Verificar duplicados por nombre
    const nameSnap = await categoriasCol.where("nombre", "==", nombre).get();
    if (!nameSnap.empty) {
      return res.status(400).json({
        success: false,
        message: "La categoria ya existe",
      });
    }
    const now = new Date();
    const data = {
      nombre,
      descripcion: descripcion || "",
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await categoriasCol.add(data);
    const docSnap = await docRef.get();
    return res.status(201).json({
      success: true,
      id: docSnap.id,
      ...docSnap.data(),
    });
  } catch (error) {
    console.error("Error creando categoria:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear categoria",
      error: error.message,
    });
  }
});

// Listar todas las categorias
router.get("/", async (_req, res) => {
  try {
    const snapshot = await categoriasCol.get();
    const categorias = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return res.status(200).json(categorias);
  } catch (error) {
    console.error("Error obteniendo categorias:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener categorias",
      error: error.message,
    });
  }
});

export default router;
