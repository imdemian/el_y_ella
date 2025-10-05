// functions/routes/tiendaRouter.js
import express from "express";
import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/authMiddleware.js";
import { FALSE } from "sass";

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

      // Si solo se está cambiando el estado activa, no requerir nombre
      if (!nombre && activa === undefined) {
        return res.status(400).json({
          success: false,
          message: "Debe proporcionar al menos un campo para actualizar",
        });
      }

      // Verificar que la tienda existe
      const { data: tiendaExistente } = await supabase
        .from("tiendas")
        .select("*")
        .eq("id", id)
        .single();

      if (!tiendaExistente) {
        return res.status(404).json({
          success: false,
          message: "Tienda no encontrada",
        });
      }

      // Verificar duplicados solo si se está cambiando el nombre
      if (nombre && nombre !== tiendaExistente.nombre) {
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
      }

      // Preparar datos para actualizar
      const updateData = {
        updated_at: new Date(),
      };

      if (nombre !== undefined) updateData.nombre = nombre;
      if (direccion !== undefined) updateData.direccion = direccion || "";
      if (telefono !== undefined) updateData.telefono = telefono || "";
      if (activa !== undefined) updateData.activa = activa;

      // Actualizar tienda
      const { data: tiendaActualizada, error: errorActualizar } = await supabase
        .from("tiendas")
        .update(updateData)
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

// Desactivar tienda (soft delete)
router.patch(
  "/:id/desactivar",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que la tienda existe
      const { data: tiendaExistente, error: errorBuscar } = await supabase
        .from("tiendas")
        .select("*")
        .eq("id", id);

      if (errorBuscar) throw errorBuscar;

      if (!tiendaExistente || tiendaExistente.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tienda no encontrada",
        });
      }

      // Desactivar tienda
      const { data: tiendaDesactivada, error: errorActualizar } = await supabase
        .from("tiendas")
        .update({
          activa: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (errorActualizar) throw errorActualizar;

      if (!tiendaDesactivada || tiendaDesactivada.length === 0) {
        return res.status(500).json({
          success: false,
          message: "No se pudo desactivar la tienda",
        });
      }

      return res.status(200).json({
        success: true,
        data: tiendaDesactivada[0],
        message: "Tienda desactivada exitosamente",
      });
    } catch (error) {
      console.error("Error desactivando tienda:", error.message);
      return res.status(500).json({
        success: false,
        message: "Error al desactivar tienda",
      });
    }
  }
);

// Reactivar tienda
router.patch(
  "/:id/reactivar",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que la tienda existe
      const { data: tiendaExistente, error: errorBuscar } = await supabase
        .from("tiendas")
        .select("*")
        .eq("id", id);

      if (errorBuscar) throw errorBuscar;

      if (!tiendaExistente || tiendaExistente.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tienda no encontrada",
        });
      }

      // Reactivar tienda
      const { data: tiendaReactivada, error: errorActualizar } = await supabase
        .from("tiendas")
        .update({
          activa: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (errorActualizar) throw errorActualizar;

      if (!tiendaReactivada || tiendaReactivada.length === 0) {
        return res.status(500).json({
          success: false,
          message: "No se pudo reactivar la tienda",
        });
      }

      return res.status(200).json({
        success: true,
        data: tiendaReactivada[0],
        message: "Tienda reactivada exitosamente",
      });
    } catch (error) {
      console.error("Error reactivando tienda:", error.message);
      return res.status(500).json({
        success: false,
        message: "Error al reactivar tienda",
      });
    }
  }
);

export default router;
