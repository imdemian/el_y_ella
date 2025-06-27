import express from "express";
import { db } from "../admin.js";

const router = express.Router();
const productsCol = db.collection("products");

// Crear producto
router.post("/", async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      categoria,
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
    // Verificar duplicados por nombre
    const nameSnap = await productsCol.where("nombre", "==", nombre).get();
    if (!nameSnap.empty) {
      return res
        .status(400)
        .json({ success: false, message: "El producto ya existe" });
    }
    const now = new Date();
    const data = {
      nombre,
      descripcion: descripcion || "",
      categoria,
      precioBase,
      imagenes: imagenes || [],
      tieneVariantes: !!tieneVariantes,
      variantes: variantes || [],
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await productsCol.add(data);
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

// Listar todos los productos
router.get("/", async (_req, res) => {
  try {
    const snap = await productsCol.get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json(products);
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener productos",
      error: error.message,
    });
  }
});

// Obtener producto por ID
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

// Actualizar producto
router.put("/:id", async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      categoria,
      precioBase,
      tieneVariantes,
      imagenes,
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
    // Verificar duplicados excluyendo este ID
    const nameSnap = await productsCol.where("nombre", "==", nombre).get();
    if (!nameSnap.empty && nameSnap.docs.some((d) => d.id !== req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Otro producto con ese nombre ya existe",
      });
    }
    const updatedData = {
      nombre,
      descripcion: descripcion || "",
      categoria,
      precioBase,
      tieneVariantes: !!tieneVariantes,
      imagenes: imagenes || [],
      updatedAt: new Date(),
    };
    await docRef.update(updatedData);
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

// Eliminar producto
router.delete("/:id", async (req, res) => {
  try {
    const docRef = productsCol.doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }
    await docRef.delete();
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
