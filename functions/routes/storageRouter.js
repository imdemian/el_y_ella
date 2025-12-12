// functions/routes/storageRouter.js
import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * POST /storage/signed-url
 * Genera una URL firmada para subir archivos a Supabase Storage
 * Requiere autenticación
 */
router.post("/signed-url", authenticateToken, async (req, res) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: "La ruta del archivo es requerida",
      });
    }

    // Generar signed URL con el cliente admin (5 minutos de validez)
    const { data, error } = await supabaseAdmin.storage
      .from("productos")
      .createSignedUploadUrl(path, {
        upsert: true,
      });

    if (error) {
      console.error("Error generando signed URL:", error);
      return res.status(500).json({
        success: false,
        message: "Error al generar URL firmada",
        error: error.message,
      });
    }

    // Obtener la URL pública del archivo
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("productos")
      .getPublicUrl(path);

    return res.json({
      success: true,
      uploadUrl: data.signedUrl, // URL firmada para subir
      token: data.token, // Token necesario para la subida
      publicUrl: publicUrlData.publicUrl, // URL pública final
      path: data.path,
    });
  } catch (error) {
    console.error("Error en /storage/signed-url:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
});

/**
 * DELETE /storage/delete
 * Elimina un archivo de Supabase Storage
 * Requiere autenticación
 */
router.delete("/delete", authenticateToken, async (req, res) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: "La ruta del archivo es requerida",
      });
    }

    const { error } = await supabaseAdmin.storage
      .from("productos")
      .remove([path]);

    if (error) {
      console.error("Error eliminando archivo:", error);
      return res.status(500).json({
        success: false,
        message: "Error al eliminar archivo",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Archivo eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error en /storage/delete:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
});

export default router;
