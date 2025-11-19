// routes_copy/descuentosRouter.js
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
 * GET /descuentos - Obtener todos los descuentos
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("codigos_descuento")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error al obtener descuentos:", error);
    res.status(500).json({
      message: error.message || "Error al cargar descuentos",
    });
  }
});

/**
 * GET /descuentos/activos - Obtener descuentos activos
 */
router.get("/activos", async (req, res) => {
  try {
    const ahora = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("codigos_descuento")
      .select("*")
      .eq("activo", true)
      .lte("fecha_inicio", ahora)
      .gte("fecha_fin", ahora)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error al obtener descuentos activos:", error);
    res.status(500).json({
      message: error.message || "Error al cargar descuentos activos",
    });
  }
});

/**
 * GET /descuentos/:id - Obtener descuento por ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("codigos_descuento")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error al obtener descuento:", error);
    res.status(500).json({
      message: error.message || "Error al cargar descuento",
    });
  }
});

/**
 * POST /descuentos - Crear nuevo descuento
 */
router.post("/", async (req, res) => {
  try {
    const descuentoData = req.body;

    // Convertir código a mayúsculas
    if (descuentoData.codigo) {
      descuentoData.codigo = descuentoData.codigo.toUpperCase();
    }

    const { data, error } = await supabaseAdmin
      .from("codigos_descuento")
      .insert([descuentoData])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({
          message: "El código de descuento ya existe",
        });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error al crear descuento:", error);
    res.status(500).json({
      message: error.message || "Error al crear descuento",
    });
  }
});

/**
 * PUT /descuentos/:id - Actualizar descuento
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const descuentoData = req.body;

    // Convertir código a mayúsculas si existe
    if (descuentoData.codigo) {
      descuentoData.codigo = descuentoData.codigo.toUpperCase();
    }

    const { data, error } = await supabaseAdmin
      .from("codigos_descuento")
      .update(descuentoData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error al actualizar descuento:", error);
    res.status(500).json({
      message: error.message || "Error al actualizar descuento",
    });
  }
});

/**
 * DELETE /descuentos/:id - Eliminar descuento
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("codigos_descuento")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Descuento eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar descuento:", error);
    res.status(500).json({
      message: error.message || "Error al eliminar descuento",
    });
  }
});

// =====================================================
// VALIDACIÓN Y APLICACIÓN
// =====================================================

/**
 * POST /descuentos/validar - Validar código de descuento
 * Body: { codigo, subtotal, items, clienteInfo }
 */
router.post("/validar", async (req, res) => {
  try {
    const { codigo, subtotal, items = [] } = req.body;

    if (!codigo || subtotal === undefined) {
      return res.status(400).json({
        message: "Código y subtotal son requeridos",
      });
    }

    // Obtener descuento por código
    const { data: descuento, error } = await supabaseAdmin
      .from("codigos_descuento")
      .select("*")
      .eq("codigo", codigo.toUpperCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          valido: false,
          mensaje: "Código de descuento no válido",
        });
      }
      throw error;
    }

    // Verificar si está activo
    if (!descuento.activo) {
      return res.json({
        valido: false,
        mensaje: "Este código de descuento no está activo",
      });
    }

    // Verificar fechas de vigencia
    const ahora = new Date();
    const fechaInicio = new Date(descuento.fecha_inicio);
    const fechaFin = new Date(descuento.fecha_fin);

    if (ahora < fechaInicio) {
      return res.json({
        valido: false,
        mensaje: `Este código estará disponible a partir del ${fechaInicio.toLocaleDateString()}`,
      });
    }

    if (ahora > fechaFin) {
      return res.json({
        valido: false,
        mensaje: "Este código de descuento ha expirado",
      });
    }

    // Verificar usos máximos
    if (
      descuento.usos_maximos &&
      descuento.usos_actuales >= descuento.usos_maximos
    ) {
      return res.json({
        valido: false,
        mensaje: "Este código de descuento ha alcanzado su límite de usos",
      });
    }

    // Verificar monto mínimo
    if (subtotal < descuento.monto_minimo) {
      return res.json({
        valido: false,
        mensaje: `Compra mínima requerida: $${descuento.monto_minimo.toFixed(
          2
        )}`,
      });
    }

    // Verificar si aplica a los productos del carrito
    if (descuento.aplica_a !== "todo") {
      const aplicaItems = verificarAplicacionItems(descuento, items);
      if (!aplicaItems) {
        return res.json({
          valido: false,
          mensaje: "Este código no aplica a los productos en tu carrito",
        });
      }
    }

    // Calcular monto del descuento
    const montoDescuento = calcularMontoDescuento(descuento, subtotal);

    res.json({
      valido: true,
      descuento: descuento,
      montoDescuento: montoDescuento,
      mensaje: `Descuento aplicado: -$${montoDescuento.toFixed(2)}`,
    });
  } catch (error) {
    console.error("Error al validar descuento:", error);
    res.status(500).json({
      valido: false,
      mensaje: error.message || "Error al validar el código de descuento",
    });
  }
});

/**
 * POST /descuentos/registrar-uso - Registrar uso de descuento
 * Body: { descuentoId, ventaId, clienteInfo, montoDescuento }
 */
router.post("/registrar-uso", async (req, res) => {
  try {
    const { descuentoId, ventaId, clienteInfo, montoDescuento } = req.body;

    // Insertar registro de uso
    const { error: insertError } = await supabaseAdmin
      .from("uso_descuentos")
      .insert([
        {
          codigo_descuento_id: descuentoId,
          venta_id: ventaId,
          cliente_info: clienteInfo,
          monto_descuento: montoDescuento,
        },
      ]);

    if (insertError) throw insertError;

    // Incrementar contador de usos
    const { data: descuento } = await supabaseAdmin
      .from("codigos_descuento")
      .select("usos_actuales")
      .eq("id", descuentoId)
      .single();

    await supabaseAdmin
      .from("codigos_descuento")
      .update({ usos_actuales: (descuento?.usos_actuales || 0) + 1 })
      .eq("id", descuentoId);

    res.json({ success: true });
  } catch (error) {
    console.error("Error al registrar uso de descuento:", error);
    res.status(500).json({
      message: error.message || "Error al registrar uso de descuento",
    });
  }
});

/**
 * GET /descuentos/:id/estadisticas - Obtener estadísticas de un descuento
 */
router.get("/:id/estadisticas", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("uso_descuentos")
      .select(
        `
        *,
        ventas (
          total,
          created_at
        )
      `
      )
      .eq("codigo_descuento_id", id);

    if (error) throw error;

    const estadisticas = {
      total_usos: data?.length || 0,
      total_descuento_otorgado: data?.reduce(
        (sum, uso) => sum + parseFloat(uso.monto_descuento || 0),
        0
      ),
      total_ventas_generadas: data?.reduce(
        (sum, uso) => sum + parseFloat(uso.ventas?.total || 0),
        0
      ),
      usos_por_dia: {},
    };

    // Agrupar por día
    data?.forEach((uso) => {
      const fecha = new Date(uso.fecha_uso).toLocaleDateString();
      estadisticas.usos_por_dia[fecha] =
        (estadisticas.usos_por_dia[fecha] || 0) + 1;
    });

    res.json(estadisticas);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
      message: error.message || "Error al cargar estadísticas",
    });
  }
});

// =====================================================
// FUNCIONES HELPER
// =====================================================

/**
 * Calcular monto del descuento
 */
function calcularMontoDescuento(descuento, subtotal) {
  let montoDescuento = 0;

  if (descuento.tipo_descuento === "porcentaje") {
    montoDescuento = (subtotal * descuento.valor) / 100;

    // Aplicar monto máximo si existe
    if (descuento.monto_maximo && montoDescuento > descuento.monto_maximo) {
      montoDescuento = descuento.monto_maximo;
    }
  } else if (descuento.tipo_descuento === "fijo") {
    montoDescuento = descuento.valor;

    // No puede ser mayor al subtotal
    if (montoDescuento > subtotal) {
      montoDescuento = subtotal;
    }
  }

  return parseFloat(montoDescuento.toFixed(2));
}

/**
 * Verificar si el descuento aplica a los items del carrito
 */
function verificarAplicacionItems(descuento, items) {
  if (descuento.aplica_a === "todo") return true;
  if (!items || items.length === 0) return false;

  // Verificar si algún item cumple con las condiciones
  for (const item of items) {
    if (descuento.aplica_a === "categoria") {
      if (
        descuento.referencia_ids &&
        descuento.referencia_ids.includes(item.producto?.categoria_id)
      ) {
        return true;
      }
    } else if (descuento.aplica_a === "producto") {
      if (
        descuento.referencia_ids &&
        descuento.referencia_ids.includes(item.producto_id)
      ) {
        return true;
      }
    }
  }

  return false;
}

export default router;
