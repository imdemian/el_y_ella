// routes_copy/codigosAccesoRouter.js
import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// =====================================================
// CRUD BÁSICO
// =====================================================

/**
 * GET /codigos-acceso - Obtener todos los códigos de acceso
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("codigos_acceso")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error al obtener códigos de acceso:", error);
    res.status(500).json({
      message: error.message || "Error al cargar códigos de acceso",
    });
  }
});

/**
 * GET /codigos-acceso/activos - Obtener códigos activos
 */
router.get("/activos", async (req, res) => {
  try {
    const ahora = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("codigos_acceso")
      .select("*")
      .eq("activo", true)
      .lte("fecha_inicio", ahora)
      .or(`fecha_fin.is.null,fecha_fin.gte.${ahora}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error al obtener códigos activos:", error);
    res.status(500).json({
      message: error.message || "Error al cargar códigos activos",
    });
  }
});

/**
 * GET /codigos-acceso/:id - Obtener código por ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("codigos_acceso")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error al obtener código de acceso:", error);
    res.status(500).json({
      message: error.message || "Error al cargar código de acceso",
    });
  }
});

/**
 * POST /codigos-acceso - Crear nuevo código de acceso
 */
router.post("/", async (req, res) => {
  try {
    const codigoData = req.body;

    // Generar código automático si no se proporciona
    if (!codigoData.codigo || codigoData.codigo.trim() === "") {
      codigoData.codigo = generarCodigoAleatorio(12);
    } else {
      codigoData.codigo = codigoData.codigo.toUpperCase();
    }

    const { data, error } = await supabaseAdmin
      .from("codigos_acceso")
      .insert([codigoData])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({
          message: "El código de acceso ya existe",
        });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error al crear código de acceso:", error);
    res.status(500).json({
      message: error.message || "Error al crear código de acceso",
    });
  }
});

/**
 * PUT /codigos-acceso/:id - Actualizar código de acceso
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const codigoData = req.body;

    // Convertir código a mayúsculas si existe
    if (codigoData.codigo) {
      codigoData.codigo = codigoData.codigo.toUpperCase();
    }

    const { data, error } = await supabaseAdmin
      .from("codigos_acceso")
      .update(codigoData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error al actualizar código de acceso:", error);
    res.status(500).json({
      message: error.message || "Error al actualizar código de acceso",
    });
  }
});

/**
 * DELETE /codigos-acceso/:id - Eliminar código de acceso
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("codigos_acceso")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Código de acceso eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar código de acceso:", error);
    res.status(500).json({
      message: error.message || "Error al eliminar código de acceso",
    });
  }
});

// =====================================================
// VALIDACIÓN Y USO
// =====================================================

/**
 * POST /codigos-acceso/validar - Validar código de acceso
 * Body: { codigo }
 */
router.post("/validar", async (req, res) => {
  try {
    const { codigo } = req.body;

    if (!codigo) {
      return res.status(400).json({
        message: "El código es requerido",
      });
    }

    // Obtener código por código
    const { data: codigoAcceso, error } = await supabaseAdmin
      .from("codigos_acceso")
      .select("*")
      .eq("codigo", codigo.toUpperCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          valido: false,
          mensaje: "Código de acceso no válido",
        });
      }
      throw error;
    }

    // Verificar si está activo
    if (!codigoAcceso.activo) {
      return res.json({
        valido: false,
        mensaje: "Este código de acceso no está activo",
      });
    }

    // Verificar fecha de inicio
    const ahora = new Date();
    const fechaInicio = new Date(codigoAcceso.fecha_inicio);

    if (ahora < fechaInicio) {
      return res.json({
        valido: false,
        mensaje: `Este código estará disponible a partir del ${fechaInicio.toLocaleDateString()}`,
      });
    }

    // Verificar fecha de fin (si no es permanente)
    if (codigoAcceso.fecha_fin) {
      const fechaFin = new Date(codigoAcceso.fecha_fin);
      if (ahora > fechaFin) {
        return res.json({
          valido: false,
          mensaje: "Este código de acceso ha expirado",
        });
      }
    }

    // Verificar usos máximos (si aplica)
    if (
      codigoAcceso.usos_maximos &&
      codigoAcceso.usos_actuales >= codigoAcceso.usos_maximos
    ) {
      return res.json({
        valido: false,
        mensaje: "Este código de acceso ha alcanzado su límite de usos",
      });
    }

    res.json({
      valido: true,
      codigoAcceso: codigoAcceso,
      nivelAcceso: codigoAcceso.nivel_acceso,
      mensaje: "Código de acceso válido",
    });
  } catch (error) {
    console.error("Error al validar código de acceso:", error);
    res.status(500).json({
      valido: false,
      mensaje: error.message || "Error al validar el código de acceso",
    });
  }
});

/**
 * POST /codigos-acceso/registrar-uso - Registrar uso de código
 * Body: { codigoAccesoId, usuarioId, ipAddress, userAgent, accesoExitoso, motivoFallo }
 */
router.post("/registrar-uso", async (req, res) => {
  try {
    const {
      codigoAccesoId,
      usuarioId = null,
      ipAddress = null,
      userAgent = null,
      accesoExitoso = true,
      motivoFallo = null,
    } = req.body;

    // Insertar registro en historial
    const { error: insertError } = await supabaseAdmin
      .from("historial_accesos")
      .insert([
        {
          codigo_acceso_id: codigoAccesoId,
          usuario_id: usuarioId,
          ip_address: ipAddress,
          user_agent: userAgent,
          acceso_exitoso: accesoExitoso,
          motivo_fallo: motivoFallo,
        },
      ]);

    if (insertError) throw insertError;

    // Si el acceso fue exitoso, incrementar contador
    if (accesoExitoso) {
      const { data: codigo } = await supabaseAdmin
        .from("codigos_acceso")
        .select("usos_actuales, tipo_acceso, usos_maximos, activo")
        .eq("id", codigoAccesoId)
        .single();

      const nuevosUsos = (codigo?.usos_actuales || 0) + 1;

      // Si es de uso único, desactivarlo después del primer uso
      const debeDesactivar =
        codigo?.tipo_acceso === "uso_unico" &&
        codigo?.usos_maximos === 1 &&
        nuevosUsos >= 1;

      await supabaseAdmin
        .from("codigos_acceso")
        .update({
          usos_actuales: nuevosUsos,
          activo: debeDesactivar ? false : codigo.activo,
        })
        .eq("id", codigoAccesoId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error al registrar uso de acceso:", error);
    res.status(500).json({
      message: error.message || "Error al registrar uso de acceso",
    });
  }
});

/**
 * GET /codigos-acceso/:id/historial - Obtener historial de un código
 */
router.get("/:id/historial", async (req, res) => {
  try {
    const { id } = req.params;
    const { limite = 50 } = req.query;

    const { data, error } = await supabaseAdmin
      .from("historial_accesos")
      .select("*")
      .eq("codigo_acceso_id", id)
      .order("fecha_acceso", { ascending: false })
      .limit(parseInt(limite));

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error al obtener historial de accesos:", error);
    res.status(500).json({
      message: error.message || "Error al cargar historial de accesos",
    });
  }
});

/**
 * GET /codigos-acceso/:id/estadisticas - Obtener estadísticas de un código
 */
router.get("/:id/estadisticas", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("historial_accesos")
      .select("*")
      .eq("codigo_acceso_id", id);

    if (error) throw error;

    const estadisticas = {
      total_intentos: data?.length || 0,
      accesos_exitosos: data?.filter((h) => h.acceso_exitoso).length || 0,
      accesos_fallidos: data?.filter((h) => !h.acceso_exitoso).length || 0,
      ultimo_acceso: data?.[0]?.fecha_acceso || null,
      usuarios_unicos: [
        ...new Set(data?.map((h) => h.usuario_id).filter((id) => id)),
      ].length,
    };

    res.json(estadisticas);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
      message: error.message || "Error al cargar estadísticas",
    });
  }
});

// =====================================================
// UTILIDADES
// =====================================================

/**
 * POST /codigos-acceso/generar - Generar código aleatorio
 * Body: { longitud: 8 }
 */
router.post("/generar", async (req, res) => {
  try {
    const { longitud = 8 } = req.body;
    const codigo = generarCodigoAleatorio(parseInt(longitud));

    res.json({ codigo });
  } catch (error) {
    console.error("Error al generar código:", error);
    res.status(500).json({
      message: error.message || "Error al generar código",
    });
  }
});

// =====================================================
// FUNCIONES HELPER
// =====================================================

/**
 * Generar código aleatorio
 */
function generarCodigoAleatorio(longitud = 8) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  for (let i = 0; i < longitud; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

export default router;
