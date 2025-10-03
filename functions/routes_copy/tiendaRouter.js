// functions/routes/tiendaRouter.js
import express from "express";
import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Crear tienda
router.post(
  "/",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { nombre, direccion, telefono } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la tienda es requerido",
        });
      }

      // Verificar duplicados por nombre
      const { data: tiendaExistente } = await supabase
        .from("tiendas")
        .select("id")
        .eq("nombre", nombre)
        .single();

      if (tiendaExistente) {
        return res.status(400).json({
          success: false,
          message: "La tienda ya existe",
        });
      }

      // Crear nueva tienda
      const { data: nuevaTienda, error: errorInsertar } = await supabase
        .from("tiendas")
        .insert([
          {
            nombre: nombre,
            direccion: direccion || "",
            telefono: telefono || "",
            activa: true,
          },
        ])
        .select()
        .single();

      if (errorInsertar) throw errorInsertar;

      return res.status(201).json({
        success: true,
        data: nuevaTienda,
      });
    } catch (error) {
      console.error("Error creando tienda:", error);
      return res.status(500).json({
        success: false,
        message: "Error al crear tienda",
        error: error.message,
      });
    }
  }
);

// Listar tiendas
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { activa } = req.query;

    let query = supabase.from("tiendas").select("*").order("nombre");

    // Filtrar por estado si se especifica
    if (activa !== undefined) {
      query = query.eq("activa", activa === "true");
    }

    const { data: tiendas, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: tiendas,
    });
  } catch (error) {
    console.error("Error obteniendo tiendas:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener tiendas",
      error: error.message,
    });
  }
});

// Obtener tienda por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tienda, error } = await supabase
      .from("tiendas")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Tienda no encontrada",
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: tienda,
    });
  } catch (error) {
    console.error("Error obteniendo tienda:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener tienda",
      error: error.message,
    });
  }
});

// Actualizar tienda
router.put(
  "/:id",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, direccion, telefono, activa } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la tienda es requerido",
        });
      }

      // Verificar que la tienda existe
      const { data: tiendaExistente } = await supabase
        .from("tiendas")
        .select("id")
        .eq("id", id)
        .single();

      if (!tiendaExistente) {
        return res.status(404).json({
          success: false,
          message: "Tienda no encontrada",
        });
      }

      // Verificar duplicados (excluyendo la actual)
      const { data: duplicado } = await supabase
        .from("tiendas")
        .select("id")
        .eq("nombre", nombre)
        .neq("id", id)
        .single();

      if (duplicado) {
        return res.status(400).json({
          success: false,
          message: "Ya existe otra tienda con ese nombre",
        });
      }

      // Actualizar tienda
      const { data: tiendaActualizada, error: errorActualizar } = await supabase
        .from("tiendas")
        .update({
          nombre: nombre,
          direccion: direccion || "",
          telefono: telefono || "",
          activa: activa !== undefined ? activa : true,
          updated_at: new Date(),
        })
        .eq("id", id)
        .select()
        .single();

      if (errorActualizar) throw errorActualizar;

      return res.status(200).json({
        success: true,
        data: tiendaActualizada,
      });
    } catch (error) {
      console.error("Error actualizando tienda:", error);
      return res.status(500).json({
        success: false,
        message: "Error al actualizar tienda",
        error: error.message,
      });
    }
  }
);

export default router;
