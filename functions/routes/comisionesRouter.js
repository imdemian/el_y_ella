// routes_copy/comisionesRouter.js
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
 * GET /comisiones - Obtener todas las comisiones
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("comisiones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error al obtener comisiones:", error);
    res.status(500).json({
      message: error.message || "Error al cargar comisiones",
    });
  }
});

/**
 * GET /comisiones/activas - Obtener comisiones activas
 */
router.get("/activas", async (req, res) => {
  try {
    const fechaActual = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("comisiones")
      .select("*")
      .eq("activo", true)
      .lte("fecha_inicio", fechaActual)
      .or(`fecha_fin.is.null,fecha_fin.gte.${fechaActual}`);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error al obtener comisiones activas:", error);
    res.status(500).json({
      message: error.message || "Error al cargar comisiones activas",
    });
  }
});

/**
 * GET /comisiones/:id - Obtener comisión por ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("comisiones")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error al obtener comisión:", error);
    res.status(500).json({
      message: error.message || "Error al cargar comisión",
    });
  }
});

/**
 * POST /comisiones - Crear nueva comisión
 */
router.post("/", async (req, res) => {
  try {
    const comisionData = req.body;

    // Validaciones
    if (
      !comisionData.nombre ||
      !comisionData.tipo_comision ||
      !comisionData.valor ||
      !comisionData.aplica_a ||
      !comisionData.fecha_inicio
    ) {
      return res.status(400).json({
        message: "Faltan campos requeridos",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("comisiones")
      .insert([comisionData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Error al crear comisión:", error);
    res.status(500).json({
      message: error.message || "Error al crear comisión",
    });
  }
});

/**
 * PUT /comisiones/:id - Actualizar comisión
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const comisionData = req.body;

    const { data, error } = await supabaseAdmin
      .from("comisiones")
      .update(comisionData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error al actualizar comisión:", error);
    res.status(500).json({
      message: error.message || "Error al actualizar comisión",
    });
  }
});

/**
 * DELETE /comisiones/:id - Eliminar comisión
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("comisiones")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Comisión eliminada exitosamente" });
  } catch (error) {
    console.error("Error al eliminar comisión:", error);
    res.status(500).json({
      message: error.message || "Error al eliminar comisión",
    });
  }
});

// =====================================================
// FUNCIONES DE CÁLCULO
// =====================================================

/**
 * POST /comisiones/calcular - Calcular comisión para una venta
 * Body: { venta: { total, usuario_id, ventas_items: [...] } }
 */
router.post("/calcular", async (req, res) => {
  try {
    const { venta } = req.body;

    if (!venta || !venta.total) {
      return res.status(400).json({
        message: "Datos de venta inválidos",
      });
    }

    // Obtener comisiones activas
    const fechaActual = new Date().toISOString().split("T")[0];
    const { data: comisionesActivas, error } = await supabaseAdmin
      .from("comisiones")
      .select("*")
      .eq("activo", true)
      .lte("fecha_inicio", fechaActual)
      .or(`fecha_fin.is.null,fecha_fin.gte.${fechaActual}`);

    if (error) throw error;

    let comisionTotal = 0;
    const desglose = [];

    for (const comision of comisionesActivas || []) {
      // Verificar si aplica a esta venta
      const aplica = verificarAplicacionComision(comision, venta);

      if (aplica) {
        let montoComision = 0;

        if (comision.tipo_comision === "porcentaje") {
          montoComision = (venta.total * comision.valor) / 100;
        } else if (comision.tipo_comision === "fijo") {
          montoComision = comision.valor;
        }

        comisionTotal += montoComision;
        desglose.push({
          comision_id: comision.id,
          nombre: comision.nombre,
          tipo: comision.tipo_comision,
          valor: comision.valor,
          monto: montoComision,
        });
      }
    }

    res.json({
      comisionTotal: parseFloat(comisionTotal.toFixed(2)),
      desglose,
    });
  } catch (error) {
    console.error("Error al calcular comisión:", error);
    res.status(500).json({
      message: error.message || "Error al calcular comisión",
    });
  }
});

/**
 * GET /comisiones/empleado/:empleadoId - Obtener comisiones de un empleado
 */
router.get("/empleado/:empleadoId", async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const fechaActual = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("comisiones")
      .select("*")
      .eq("activo", true)
      .lte("fecha_inicio", fechaActual)
      .or(`fecha_fin.is.null,fecha_fin.gte.${fechaActual}`)
      .or(
        `aplica_a.eq.todos,and(aplica_a.eq.empleado,referencia_id.eq.${empleadoId})`
      );

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error("Error al obtener comisiones del empleado:", error);
    res.status(500).json({
      message: error.message || "Error al cargar comisiones del empleado",
    });
  }
});

// =====================================================
// FUNCIONES HELPER
// =====================================================

/**
 * Verificar si una comisión aplica a una venta específica
 */
function verificarAplicacionComision(comision, venta) {
  // Comisión para todos
  if (comision.aplica_a === "todos") {
    return true;
  }

  // Comisión por empleado
  if (comision.aplica_a === "empleado") {
    return venta.usuario_id === comision.referencia_id;
  }

  // Comisión por categoría
  if (comision.aplica_a === "categoria") {
    if (!venta.ventas_items || venta.ventas_items.length === 0) return false;

    for (const item of venta.ventas_items) {
      if (item.producto?.categoria_id === comision.referencia_id) {
        return true;
      }
    }
    return false;
  }

  // Comisión por producto específico
  if (comision.aplica_a === "producto") {
    if (!venta.ventas_items || venta.ventas_items.length === 0) return false;

    return venta.ventas_items.some(
      (item) => item.producto_id === comision.referencia_id
    );
  }

  return false;
}

export default router;
