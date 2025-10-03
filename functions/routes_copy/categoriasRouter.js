// functions/routes/categoriasRouter.js
import express from "express";
import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// CREAR CATEGORÍA - Solo admin/manager
router.post(
  "/",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { nombre } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la categoria es requerido",
        });
      }

      // Verificar duplicados por nombre
      const { data: categoriaExistente } = await supabase
        .from("categorias")
        .select("id")
        .eq("nombre", nombre)
        .single();

      if (categoriaExistente) {
        return res.status(400).json({
          success: false,
          message: "La categoria ya existe",
        });
      }

      // Crear nueva categoría
      const { data: nuevaCategoria, error: errorInsertar } = await supabase
        .from("categorias")
        .insert([{ nombre: nombre }])
        .select()
        .single();

      if (errorInsertar) throw errorInsertar;

      return res.status(201).json({
        success: true,
        data: nuevaCategoria,
      });
    } catch (error) {
      console.error("Error creando categoria:", error);
      return res.status(500).json({
        success: false,
        message: "Error al crear categoria",
        error: error.message,
      });
    }
  }
);

// LISTAR CATEGORÍAS - Cualquier usuario autenticado
router.get("/", authenticateToken, async (req, res) => {
  // ✅ AGREGAR authenticateToken
  try {
    const { data: categorias, error } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre");

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: categorias,
    });
  } catch (error) {
    console.error("Error obteniendo categorias:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener categorias",
      error: error.message,
    });
  }
});

// OBTENER CATEGORÍA POR ID - Cualquier usuario autenticado
router.get("/:id", authenticateToken, async (req, res) => {
  // ✅ AGREGAR authenticateToken
  try {
    const { id } = req.params;

    const { data: categoria, error } = await supabase
      .from("categorias")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Categoria no encontrada",
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: categoria,
    });
  } catch (error) {
    console.error("Error obteniendo categoria:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener categoria",
      error: error.message,
    });
  }
});

// ACTUALIZAR CATEGORÍA - Solo admin/manager
router.put(
  "/:id",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la categoria es requerido",
        });
      }

      // Verificar que la categoría existe
      const { data: categoriaExistente } = await supabase
        .from("categorias")
        .select("id")
        .eq("id", id)
        .single();

      if (!categoriaExistente) {
        return res.status(404).json({
          success: false,
          message: "Categoria no encontrada",
        });
      }

      // Verificar duplicados (excluyendo la actual)
      const { data: duplicado } = await supabase
        .from("categorias")
        .select("id")
        .eq("nombre", nombre)
        .neq("id", id)
        .single();

      if (duplicado) {
        return res.status(400).json({
          success: false,
          message: "Ya existe otra categoria con ese nombre",
        });
      }

      // Actualizar categoría
      const { data: categoriaActualizada, error: errorActualizar } =
        await supabase
          .from("categorias")
          .update({
            nombre: nombre,
            updated_at: new Date(),
          })
          .eq("id", id)
          .select()
          .single();

      if (errorActualizar) throw errorActualizar;

      return res.status(200).json({
        success: true,
        data: categoriaActualizada,
      });
    } catch (error) {
      console.error("Error actualizando categoria:", error);
      return res.status(500).json({
        success: false,
        message: "Error al actualizar categoria",
        error: error.message,
      });
    }
  }
);

// ELIMINAR CATEGORÍA - Solo admin
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que la categoría existe
      const { data: categoriaExistente } = await supabase
        .from("categorias")
        .select("id")
        .eq("id", id)
        .single();

      if (!categoriaExistente) {
        return res.status(404).json({
          success: false,
          message: "Categoria no encontrada",
        });
      }

      // Verificar si la categoría tiene productos asociados
      const { data: productosAsociados, error: errorProductos } = await supabase
        .from("productos")
        .select("id")
        .eq("categoria_id", id)
        .limit(1);

      if (errorProductos) throw errorProductos;

      if (productosAsociados && productosAsociados.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "No se puede eliminar la categoria porque tiene productos asociados",
        });
      }

      // Eliminar categoría
      const { error: errorEliminar } = await supabase
        .from("categorias")
        .delete()
        .eq("id", id);

      if (errorEliminar) throw errorEliminar;

      return res.status(200).json({
        success: true,
        message: "Categoria eliminada correctamente",
      });
    } catch (error) {
      console.error("Error eliminando categoria:", error);
      return res.status(500).json({
        success: false,
        message: "Error al eliminar categoria",
        error: error.message,
      });
    }
  }
);

export default router;
