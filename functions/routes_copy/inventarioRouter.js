// functions/routes_copy/inventarioRouter.js
import express from "express";
import { supabaseAdmin as supabase } from "../config/supabase.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/* ======================= INVENTARIO GLOBAL ======================= */

/**
 * GET /inventario/global
 * Obtener inventario global con filtros
 */
router.get("/global", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      categoria_id,
      bajo_minimo = false,
      sin_stock = false,
    } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    // Query base
    let query = supabase.from("inventario_global").select(
      `
        *,
        variantes_producto (
          id,
          sku,
          atributos,
          precio,
          activo,
          productos (
            id,
            nombre,
            categoria_id,
            categorias (id, nombre)
          )
        )
      `,
      { count: "exact" }
    );

    // Filtros
    if (bajo_minimo === "true" || bajo_minimo === true) {
      // Stock por debajo del mínimo usando SQL
      query = query.filter("cantidad_disponible", "lt", "minimo_stock");
    }

    if (sin_stock === "true" || sin_stock === true) {
      query = query.eq("cantidad_disponible", 0);
    }

    // Ordenamiento y paginación
    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limitInt - 1);

    const { data: inventario, error, count } = await query;

    if (error) {
      console.error("Error al obtener inventario global:", error);
      return res.status(500).json({ error: error.message });
    }

    // Filtrar por búsqueda y categoría en memoria (porque las relaciones no soportan filtros directos)
    let resultados = inventario;

    if (search) {
      const searchLower = search.toLowerCase();
      resultados = resultados.filter(
        (item) =>
          item.variantes_producto?.sku?.toLowerCase().includes(searchLower) ||
          item.variantes_producto?.productos?.nombre
            ?.toLowerCase()
            .includes(searchLower)
      );
    }

    if (categoria_id) {
      resultados = resultados.filter(
        (item) =>
          item.variantes_producto?.productos?.categoria_id ===
          parseInt(categoria_id)
      );
    }

    res.json({
      data: resultados,
      pagination: {
        current_page: pageInt,
        per_page: limitInt,
        total_items: count,
        total_pages: Math.ceil(count / limitInt),
      },
    });
  } catch (error) {
    console.error("Error en GET /inventario/global:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /inventario/global/:variante_id
 * Obtener inventario global de una variante específica
 */
router.get("/global/:variante_id", async (req, res) => {
  try {
    const { variante_id } = req.params;

    const { data, error } = await supabase
      .from("inventario_global")
      .select(
        `
        *,
        variantes_producto (
          id,
          sku,
          atributos,
          precio,
          productos (id, nombre)
        )
      `
      )
      .eq("variante_id", variante_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res
          .status(404)
          .json({ error: "Inventario no encontrado para esta variante" });
      }
      console.error("Error al obtener inventario:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("Error en GET /inventario/global/:variante_id:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /inventario/global/:variante_id
 * Actualizar inventario global (solo admin/manager)
 */
router.put(
  "/global/:variante_id",
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { variante_id } = req.params;
      const { cantidad_disponible, minimo_stock } = req.body;

      const updateData = {};
      if (cantidad_disponible !== undefined)
        updateData.cantidad_disponible = parseInt(cantidad_disponible);
      if (minimo_stock !== undefined)
        updateData.minimo_stock = parseInt(minimo_stock);

      const { data, error } = await supabase
        .from("inventario_global")
        .update(updateData)
        .eq("variante_id", variante_id)
        .select()
        .single();

      if (error) {
        console.error("Error al actualizar inventario:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json({
        message: "Inventario actualizado correctamente",
        data,
      });
    } catch (error) {
      console.error("Error en PUT /inventario/global/:variante_id:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/* ======================= INVENTARIO POR TIENDA ======================= */

/**
 * GET /inventario/tienda/:tienda_id
 * Obtener inventario de una tienda específica
 */
router.get("/tienda/:tienda_id", async (req, res) => {
  try {
    const { tienda_id } = req.params;
    const {
      page = 1,
      limit = 50,
      search = "",
      categoria_id,
      sin_stock = false,
    } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    // Query base
    let query = supabase
      .from("inventario_tiendas")
      .select(
        `
        *,
        variantes_producto (
          id,
          sku,
          atributos,
          precio,
          productos (
            id,
            nombre,
            categoria_id,
            categorias (id, nombre)
          )
        ),
        tiendas (id, nombre)
      `,
        { count: "exact" }
      )
      .eq("tienda_id", parseInt(tienda_id));

    // Filtros
    if (sin_stock === "true" || sin_stock === true) {
      query = query.eq("cantidad_disponible", 0);
    }

    // Ordenamiento y paginación
    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limitInt - 1);

    const { data: inventario, error, count } = await query;

    if (error) {
      console.error("Error al obtener inventario de tienda:", error);
      return res.status(500).json({ error: error.message });
    }

    // Filtros en memoria
    let resultados = inventario;

    if (search) {
      const searchLower = search.toLowerCase();
      resultados = resultados.filter(
        (item) =>
          item.variantes_producto?.sku?.toLowerCase().includes(searchLower) ||
          item.variantes_producto?.productos?.nombre
            ?.toLowerCase()
            .includes(searchLower)
      );
    }

    if (categoria_id) {
      resultados = resultados.filter(
        (item) =>
          item.variantes_producto?.productos?.categoria_id ===
          parseInt(categoria_id)
      );
    }

    res.json({
      data: resultados,
      pagination: {
        current_page: pageInt,
        per_page: limitInt,
        total_items: count,
        total_pages: Math.ceil(count / limitInt),
      },
    });
  } catch (error) {
    console.error("Error en GET /inventario/tienda/:tienda_id:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /inventario/tienda/:tienda_id/variante/:variante_id
 * Obtener inventario específico de una variante en una tienda
 */
router.get("/tienda/:tienda_id/variante/:variante_id", async (req, res) => {
  try {
    const { tienda_id, variante_id } = req.params;

    const { data, error } = await supabase
      .from("inventario_tiendas")
      .select(
        `
        *,
        variantes_producto (
          id,
          sku,
          atributos,
          precio,
          productos (id, nombre)
        ),
        tiendas (id, nombre)
      `
      )
      .eq("tienda_id", parseInt(tienda_id))
      .eq("variante_id", variante_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Inventario no encontrado para esta variante en esta tienda",
        });
      }
      console.error("Error al obtener inventario:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error(
      "Error en GET /inventario/tienda/:tienda_id/variante/:variante_id:",
      error
    );
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /inventario/tienda/:tienda_id/variante/:variante_id
 * Actualizar inventario de una variante en una tienda
 */
router.put("/tienda/:tienda_id/variante/:variante_id", async (req, res) => {
  try {
    const { tienda_id, variante_id } = req.params;
    const { cantidad_disponible } = req.body;

    if (cantidad_disponible === undefined) {
      return res
        .status(400)
        .json({ error: "cantidad_disponible es requerida" });
    }

    // ========== OBTENER STOCK ANTERIOR DE LA TIENDA ==========
    const { data: stockAnterior } = await supabase
      .from("inventario_tiendas")
      .select("cantidad_disponible")
      .eq("tienda_id", parseInt(tienda_id))
      .eq("variante_id", variante_id)
      .single();

    const stockPrevio = stockAnterior?.cantidad_disponible || 0;
    const stockNuevo = parseInt(cantidad_disponible);
    const diferencia = stockNuevo - stockPrevio;

    // ========== ACTUALIZAR INVENTARIO DE TIENDA ==========
    const { data, error } = await supabase
      .from("inventario_tiendas")
      .upsert(
        {
          tienda_id: parseInt(tienda_id),
          variante_id: variante_id,
          cantidad_disponible: stockNuevo,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "variante_id,tienda_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar inventario de tienda:", error);
      return res.status(500).json({ error: error.message });
    }

    // ========== SINCRONIZAR CON INVENTARIO GLOBAL ==========
    if (diferencia !== 0) {
      const { data: inventarioGlobal } = await supabase
        .from("inventario_global")
        .select("cantidad_disponible")
        .eq("variante_id", variante_id)
        .single();

      if (inventarioGlobal) {
        const nuevoStockGlobal =
          inventarioGlobal.cantidad_disponible + diferencia;

        await supabase
          .from("inventario_global")
          .update({ cantidad_disponible: nuevoStockGlobal })
          .eq("variante_id", variante_id);

        console.log(
          `✅ Inventario global sincronizado: ${inventarioGlobal.cantidad_disponible} + (${diferencia}) = ${nuevoStockGlobal}`
        );
      } else {
        // Si no existe en global, crear
        await supabase.from("inventario_global").insert([
          {
            variante_id: variante_id,
            cantidad_disponible: stockNuevo,
            inventario_minimo: 0,
          },
        ]);

        console.log(`✅ Creado inventario global con stock: ${stockNuevo}`);
      }
    }

    res.json({
      message: "Inventario de tienda actualizado correctamente",
      data,
    });
  } catch (error) {
    console.error(
      "Error en PUT /inventario/tienda/:tienda_id/variante/:variante_id:",
      error
    );
    res.status(500).json({ error: error.message });
  }
});

/* ======================= MOVIMIENTOS DE INVENTARIO ======================= */

/**
 * POST /inventario/movimiento
 * Registrar un movimiento de inventario
 */
router.post(
  "/movimiento",
  requireRole(["admin", "manager", "vendedor"]),
  async (req, res) => {
    try {
      const { variante_id, tipo_movimiento, cantidad, motivo, tienda_id } =
        req.body;

      // Validaciones
      if (!variante_id || !tipo_movimiento || !cantidad) {
        return res.status(400).json({
          error: "variante_id, tipo_movimiento y cantidad son requeridos",
        });
      }

      const tiposValidos = [
        "entrada",
        "salida",
        "transferencia",
        "reserva",
        "liberacion",
        "ajuste",
      ];
      if (!tiposValidos.includes(tipo_movimiento)) {
        return res.status(400).json({
          error: `tipo_movimiento debe ser uno de: ${tiposValidos.join(", ")}`,
        });
      }

      if (parseInt(cantidad) <= 0) {
        return res.status(400).json({ error: "cantidad debe ser mayor a 0" });
      }

      // NOTA: NO actualizamos manualmente inventario_tiendas ni inventario_global aquí
      // porque hay un TRIGGER en la base de datos que lo hace automáticamente
      // al insertar en movimientos_inventario

      // Registrar movimiento en historial (el trigger actualizará los inventarios)
      const { data: movimiento, error } = await supabase
        .from("movimientos_inventario")
        .insert([
          {
            variante_id,
            tipo_movimiento,
            cantidad: parseInt(cantidad),
            motivo: motivo || null,
            usuario_id: req.user.id,
            tienda_id: tienda_id ? parseInt(tienda_id) : null,
          },
        ])
        .select(
          `
          *,
          variantes_producto (sku, productos (nombre))
        `
        )
        .single();

      if (error) {
        console.error("Error al crear movimiento:", error);
        return res.status(500).json({ error: error.message });
      }

      res.status(201).json({
        message: "Movimiento registrado correctamente",
        data: movimiento,
      });
    } catch (error) {
      console.error("Error en POST /inventario/movimiento:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /inventario/movimientos
 * Obtener historial de movimientos con filtros
 */
router.get("/movimientos", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      variante_id,
      tipo_movimiento,
      tienda_id,
      fecha_inicio,
      fecha_fin,
    } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    // Query base
    let query = supabase.from("movimientos_inventario").select(
      `
        *,
        variantes_producto (
          id,
          sku,
          productos (id, nombre)
        ),
        tiendas (id, nombre),
        usuarios (id, nombre)
      `,
      { count: "exact" }
    );

    // Filtros
    if (variante_id) {
      query = query.eq("variante_id", variante_id);
    }
    if (tipo_movimiento) {
      query = query.eq("tipo_movimiento", tipo_movimiento);
    }
    if (tienda_id) {
      query = query.eq("tienda_id", parseInt(tienda_id));
    }
    if (fecha_inicio) {
      query = query.gte("created_at", fecha_inicio);
    }
    if (fecha_fin) {
      query = query.lte("created_at", fecha_fin);
    }

    // Ordenamiento y paginación
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limitInt - 1);

    const { data: movimientos, error, count } = await query;

    if (error) {
      console.error("Error al obtener movimientos:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      data: movimientos,
      pagination: {
        current_page: pageInt,
        per_page: limitInt,
        total_items: count,
        total_pages: Math.ceil(count / limitInt),
      },
    });
  } catch (error) {
    console.error("Error en GET /inventario/movimientos:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /inventario/transferencia
 * Transferir inventario entre tiendas
 */
router.post(
  "/transferencia",
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const {
        variante_id,
        tienda_origen_id,
        tienda_destino_id,
        cantidad,
        motivo,
      } = req.body;

      // Validaciones
      if (
        !variante_id ||
        !tienda_origen_id ||
        !tienda_destino_id ||
        !cantidad
      ) {
        return res.status(400).json({
          error:
            "variante_id, tienda_origen_id, tienda_destino_id y cantidad son requeridos",
        });
      }

      if (tienda_origen_id === tienda_destino_id) {
        return res.status(400).json({
          error: "Las tiendas de origen y destino deben ser diferentes",
        });
      }

      const cantidadInt = parseInt(cantidad);
      if (cantidadInt <= 0) {
        return res.status(400).json({ error: "cantidad debe ser mayor a 0" });
      }

      // Verificar stock disponible en tienda origen
      const { data: stockOrigen, error: errorOrigen } = await supabase
        .from("inventario_tiendas")
        .select("cantidad_disponible")
        .eq("tienda_id", parseInt(tienda_origen_id))
        .eq("variante_id", variante_id)
        .single();

      if (errorOrigen || !stockOrigen) {
        return res.status(404).json({
          error: "No se encontró inventario en la tienda de origen",
        });
      }

      if (stockOrigen.cantidad_disponible < cantidadInt) {
        return res.status(400).json({
          error: `Stock insuficiente en tienda origen. Disponible: ${stockOrigen.cantidad_disponible}, Solicitado: ${cantidadInt}`,
        });
      }

      // Registrar movimiento de salida en tienda origen
      const { error: errorSalida } = await supabase
        .from("movimientos_inventario")
        .insert([
          {
            variante_id,
            tipo_movimiento: "transferencia",
            cantidad: cantidadInt,
            motivo: `Transferencia a tienda ${tienda_destino_id}. ${
              motivo || ""
            }`,
            usuario_id: req.user.id,
            tienda_id: parseInt(tienda_origen_id),
          },
        ]);

      if (errorSalida) {
        console.error("Error al registrar salida:", errorSalida);
        return res.status(500).json({ error: errorSalida.message });
      }

      // Actualizar inventario tienda origen
      const { error: errorUpdateOrigen } = await supabase
        .from("inventario_tiendas")
        .update({
          cantidad_disponible: stockOrigen.cantidad_disponible - cantidadInt,
        })
        .eq("tienda_id", parseInt(tienda_origen_id))
        .eq("variante_id", variante_id);

      if (errorUpdateOrigen) {
        console.error("Error al actualizar origen:", errorUpdateOrigen);
        return res.status(500).json({ error: errorUpdateOrigen.message });
      }

      // Registrar movimiento de entrada en tienda destino
      const { error: errorEntrada } = await supabase
        .from("movimientos_inventario")
        .insert([
          {
            variante_id,
            tipo_movimiento: "transferencia",
            cantidad: cantidadInt,
            motivo: `Transferencia desde tienda ${tienda_origen_id}. ${
              motivo || ""
            }`,
            usuario_id: req.user.id,
            tienda_id: parseInt(tienda_destino_id),
          },
        ]);

      if (errorEntrada) {
        console.error("Error al registrar entrada:", errorEntrada);
        return res.status(500).json({ error: errorEntrada.message });
      }

      // Obtener o crear inventario en tienda destino
      const { data: stockDestino } = await supabase
        .from("inventario_tiendas")
        .select("cantidad_disponible")
        .eq("tienda_id", parseInt(tienda_destino_id))
        .eq("variante_id", variante_id)
        .single();

      const nuevaCantidadDestino =
        (stockDestino?.cantidad_disponible || 0) + cantidadInt;

      const { error: errorUpdateDestino } = await supabase
        .from("inventario_tiendas")
        .upsert(
          {
            tienda_id: parseInt(tienda_destino_id),
            variante_id,
            cantidad_disponible: nuevaCantidadDestino,
          },
          {
            onConflict: "variante_id,tienda_id",
          }
        );

      if (errorUpdateDestino) {
        console.error("Error al actualizar destino:", errorUpdateDestino);
        return res.status(500).json({ error: errorUpdateDestino.message });
      }

      res.json({
        message: "Transferencia completada exitosamente",
        tienda_origen_id: parseInt(tienda_origen_id),
        tienda_destino_id: parseInt(tienda_destino_id),
        variante_id,
        cantidad: cantidadInt,
      });
    } catch (error) {
      console.error("Error en POST /inventario/transferencia:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/* ======================= ESTADÍSTICAS ======================= */

/**
 * GET /inventario/estadisticas
 * Obtener estadísticas generales del inventario
 */
router.get("/estadisticas", async (req, res) => {
  try {
    // Total de variantes con inventario
    const { count: totalVariantes } = await supabase
      .from("inventario_global")
      .select("*", { count: "exact", head: true });

    // Stock total
    const { data: stockData } = await supabase
      .from("inventario_global")
      .select("cantidad_disponible");

    const stockTotal = stockData.reduce(
      (sum, item) => sum + (item.cantidad_disponible || 0),
      0
    );

    // Variantes sin stock
    const { count: sinStock } = await supabase
      .from("inventario_global")
      .select("*", { count: "exact", head: true })
      .eq("cantidad_disponible", 0);

    // Variantes bajo mínimo (aproximado - comparación en JS)
    const { data: bajoMinimoData } = await supabase
      .from("inventario_global")
      .select("cantidad_disponible, minimo_stock");

    const bajoMinimo = bajoMinimoData.filter(
      (item) => item.cantidad_disponible < item.minimo_stock
    ).length;

    res.json({
      total_variantes: totalVariantes,
      stock_total: stockTotal,
      variantes_sin_stock: sinStock,
      variantes_bajo_minimo: bajoMinimo,
      variantes_con_stock: totalVariantes - sinStock,
    });
  } catch (error) {
    console.error("Error en GET /inventario/estadisticas:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ======================= DISTRIBUCIÓN Y CREACIÓN ======================= */

/**
 * GET /inventario/distribucion/:variante_id
 * Obtener distribución de una variante por tiendas
 */
router.get("/distribucion/:variante_id", async (req, res) => {
  try {
    const { variante_id } = req.params;

    // Obtener todas las tiendas que tienen esta variante
    const { data: inventarioTiendas, error } = await supabase
      .from("inventario_tiendas")
      .select(
        `
        variante_id,
        tienda_id,
        cantidad_disponible,
        cantidad_reservada,
        updated_at,
        tiendas (id, nombre)
      `
      )
      .eq("variante_id", variante_id);

    if (error) {
      console.error("Error al obtener distribución:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!inventarioTiendas || inventarioTiendas.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No hay inventario registrado para esta variante",
      });
    }

    // Obtener info adicional de la variante desde inventario global (incluye minimo_stock)
    const { data: varianteInfo } = await supabase
      .from("inventario_global")
      .select(
        `
        variante_id,
        cantidad_disponible,
        minimo_stock,
        variantes_producto (sku, productos (nombre))
      `
      )
      .eq("variante_id", variante_id)
      .single();

    // Formatear datos para el frontend
    const distribucion = inventarioTiendas.map((item) => ({
      tienda_id: item.tienda_id,
      tienda_nombre: item.tiendas?.nombre || "Tienda sin nombre",
      stock: item.cantidad_disponible || 0,
      ultima_actualizacion: item.updated_at,
    }));

    // Ordenar por stock descendente
    distribucion.sort((a, b) => b.stock - a.stock);

    const response = {
      success: true,
      data: distribucion,
      variante: varianteInfo
        ? {
            id: variante_id,
            sku: varianteInfo.variantes_producto?.sku || "N/A",
            productName:
              varianteInfo.variantes_producto?.productos?.nombre || "N/A",
            totalStock: varianteInfo.cantidad_disponible || 0,
            inventario_minimo: varianteInfo.minimo_stock || 0,
          }
        : null,
    };

    res.json(response);
  } catch (error) {
    console.error("Error en GET /inventario/distribucion:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /inventario/buscar-variante/:sku
 * Buscar una variante por SKU (búsqueda parcial, case-insensitive)
 */
router.get("/buscar-variante/:sku", async (req, res) => {
  try {
    const { sku } = req.params;

    if (!sku || sku.trim() === "") {
      return res.status(400).json({
        error: "SKU es requerido",
      });
    }

    // Buscar variante por SKU (búsqueda parcial)
    const { data: variantes, error } = await supabase
      .from("variantes_producto")
      .select(
        `
        id,
        sku,
        atributos,
        precio,
        producto_id,
        activo,
        productos (id, nombre, categorias (id, nombre))
      `
      )
      .ilike("sku", `%${sku.trim()}%`) // Búsqueda parcial
      .eq("activo", true) // Solo variantes activas
      .limit(10); // Máximo 10 resultados

    if (error) {
      console.error("Error al buscar variante:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!variantes || variantes.length === 0) {
      return res.status(404).json({
        error: "No se encontró ninguna variante con ese SKU",
      });
    }

    // Si encontró exactamente una, retornarla directamente
    if (variantes.length === 1) {
      return res.json({
        success: true,
        data: variantes[0],
      });
    }

    // Si encontró varias, retornar lista para que el usuario elija
    res.json({
      success: true,
      multiple: true,
      data: variantes,
      message: `Se encontraron ${variantes.length} variantes con ese SKU`,
    });
  } catch (error) {
    console.error("Error en GET /inventario/buscar-variante:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /inventario/crear
 * Crear inventario inicial para una variante en una tienda
 */
router.post("/crear", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { tienda_id, variante_id, stock_inicial, motivo } = req.body;

    // Validaciones
    if (!tienda_id || !variante_id) {
      return res.status(400).json({
        error: "tienda_id y variante_id son requeridos",
      });
    }

    if (stock_inicial == null || stock_inicial < 0) {
      return res.status(400).json({
        error: "stock_inicial debe ser mayor o igual a 0",
      });
    }

    // Verificar que la tienda existe
    const { data: tienda, error: errorTienda } = await supabase
      .from("tiendas")
      .select("id, nombre")
      .eq("id", parseInt(tienda_id))
      .single();

    if (errorTienda || !tienda) {
      return res.status(404).json({
        error: "Tienda no encontrada",
      });
    }

    // Verificar que la variante existe
    const { data: variante, error: errorVariante } = await supabase
      .from("variantes_producto")
      .select("id, sku, producto_id, productos (nombre)")
      .eq("id", variante_id)
      .single();

    if (errorVariante || !variante) {
      return res.status(404).json({
        error: "Variante no encontrada",
      });
    }

    // Verificar si ya existe inventario para esta variante en esta tienda
    const { data: existente } = await supabase
      .from("inventario_tiendas")
      .select("id")
      .eq("tienda_id", parseInt(tienda_id))
      .eq("variante_id", variante_id)
      .single();

    if (existente) {
      return res.status(400).json({
        error: "Ya existe inventario para esta variante en esta tienda",
      });
    }

    // ========== SINCRONIZACIÓN CON INVENTARIO GLOBAL ==========
    // 1. Verificar si ya existe registro en inventario_global
    const { data: inventarioGlobal } = await supabase
      .from("inventario_global")
      .select("id, cantidad_disponible, inventario_minimo")
      .eq("variante_id", variante_id)
      .single();

    if (inventarioGlobal) {
      // Si existe, SUMAR el stock al global
      const nuevoStockGlobal =
        (inventarioGlobal.cantidad_disponible || 0) + parseInt(stock_inicial);

      await supabase
        .from("inventario_global")
        .update({ cantidad_disponible: nuevoStockGlobal })
        .eq("variante_id", variante_id);

      console.log(
        `✅ Actualizado inventario_global: ${inventarioGlobal.cantidad_disponible} + ${stock_inicial} = ${nuevoStockGlobal}`
      );
    } else {
      // Si NO existe, crear nuevo registro en inventario_global
      await supabase.from("inventario_global").insert([
        {
          variante_id: variante_id,
          cantidad_disponible: parseInt(stock_inicial),
          inventario_minimo: 0, // Valor por defecto, puede ajustarse después
        },
      ]);

      console.log(
        `✅ Creado nuevo registro en inventario_global con stock: ${stock_inicial}`
      );
    }

    // 2. Crear inventario en tienda
    const { data: nuevoInventario, error: errorInventario } = await supabase
      .from("inventario_tiendas")
      .insert([
        {
          tienda_id: parseInt(tienda_id),
          variante_id: variante_id,
          cantidad_disponible: parseInt(stock_inicial),
        },
      ])
      .select()
      .single();

    if (errorInventario) {
      console.error("Error al crear inventario:", errorInventario);
      return res.status(500).json({ error: errorInventario.message });
    }

    // 3. Registrar movimiento en historial SOLO para trazabilidad
    // IMPORTANTE: Este movimiento usa tipo "ajuste" para que el trigger NO lo procese
    // (ya actualizamos manualmente inventario_global e inventario_tiendas arriba)
    if (stock_inicial > 0) {
      await supabase.from("movimientos_inventario").insert([
        {
          variante_id: variante_id,
          tipo_movimiento: "ajuste", // Tipo que el trigger puede ignorar
          cantidad: parseInt(stock_inicial),
          motivo: motivo || "Inventario inicial - Producto agregado a tienda",
          usuario_id: req.user.id,
          tienda_id: parseInt(tienda_id),
        },
      ]);
    }

    res.json({
      success: true,
      message: "Inventario creado exitosamente",
      data: {
        id: nuevoInventario.id,
        tienda_id: parseInt(tienda_id),
        tienda_nombre: tienda.nombre,
        variante_id: variante_id,
        variante_sku: variante.sku,
        producto_nombre: variante.productos?.nombre,
        stock: parseInt(stock_inicial),
      },
    });
  } catch (error) {
    console.error("Error en POST /inventario/crear:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
