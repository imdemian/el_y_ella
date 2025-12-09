// functions/routes/usuariosRouter.js
import express from "express";
import { supabaseAdmin } from "../config/supabase.js"; // Importamos el cliente admin
import {
  authenticateToken,
  requireRole,
} from "../middlewares/authMiddleware.js"; // Importamos los middlewares

const router = express.Router();

// Todas las rutas en este archivo requerirán autenticación y rol de 'admin'
router.use(authenticateToken, requireRole(["admin"]));

/**
 * Listar todos los usuarios
 * GET /api/usuarios/
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select("*, tienda:tiendas(nombre)");

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error listando usuarios", error: error.message });
  }
});

/**
 * Obtener un usuario por ID
 * GET /api/usuarios/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select("*, tienda:tiendas(nombre)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json(data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error obteniendo usuario", error: error.message });
  }
});

/**
 * Actualizar los datos de un usuario (solo un admin puede)
 * PUT /api/usuarios/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, rol, activo, tienda_id } = req.body;

    // Objeto con los campos que un admin puede actualizar
    const updates = {
      nombre,
      apellido,
      rol,
      activo,
      tienda_id,
    };

    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res
        .status(404)
        .json({ message: "Usuario no encontrado para actualizar" });

    res.json({ message: "Usuario actualizado", user: data });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error actualizando usuario", error: error.message });
  }
});

/**
 * Eliminar un usuario (Auth y BD)
 * DELETE /api/usuarios/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) throw error;

    // ¡No necesitas borrar de la tabla 'usuarios'!
    // ON DELETE CASCADE lo hace automáticamente por ti.
    res.json({ success: true, message: "Usuario eliminado correctamente" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error eliminando usuario", error: error.message });
  }
});

/**
 * Cambiar contraseña de un usuario (solo un admin)
 * PUT /api/usuarios/:id/password-change
 */
router.put("/:id/password-change", async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaPassword } = req.body;

    if (!nuevaPassword) {
      return res
        .status(400)
        .json({ message: "La nueva contraseña es requerida" });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: nuevaPassword,
    });

    if (error) throw error;

    res.json({ success: true, message: "Contraseña actualizada" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error cambiando contraseña", error: error.message });
  }
});

export default router;
