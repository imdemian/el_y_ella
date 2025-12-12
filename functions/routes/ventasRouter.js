// routes/ventasRouter.js
import express from "express";
import { supabaseAdmin as supabase } from "../config/supabase.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * POST /ventas
 * Crear una nueva venta
 * Valida inventario global y por tienda antes de crear la venta
 */
router.post("/", async (req, res) => {
  try {
    const {
      items,
      subtotal,
      descuento = 0,
      impuestos = 0,
      total,
      metodo_pago,
      estado_venta = "completada",
      cliente_info = null, // JSONB con datos del cliente (solo si es relevante)
      codigo_descuento_id = null, // ID del código de descuento aplicado
      descuento_aplicado = 0, // Monto del descuento aplicado
      notas,
      tienda_id, // Permitir tienda_id en el body para admins/managers
    } = req.body;
    const usuario_id = req.user?.id;
    const usuario_tienda_id = req.user?.tienda_id;

    // Validaciones
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Debe incluir al menos un item en la venta" });
    }

    if (!metodo_pago) {
      return res
        .status(400)
        .json({ message: "El método de pago es requerido" });
    }

    // Determinar la tienda para la venta
    let tienda_venta = null;

    console.log("🔍 DEBUG tienda_id recibido:");
    console.log(
      "  - req.body.tienda_id:",
      tienda_id,
      "- Tipo:",
      typeof tienda_id
    );
    console.log(
      "  - req.user.tienda_id:",
      usuario_tienda_id,
      "- Tipo:",
      typeof usuario_tienda_id
    );

    // Si el usuario tiene tienda asignada, usar esa
    if (usuario_tienda_id) {
      tienda_venta = usuario_tienda_id;
      console.log("  ✅ Usando tienda del usuario:", tienda_venta);
    }
    // Si NO tiene tienda, DEBE especificar tienda_id en el body
    else if (tienda_id) {
      tienda_venta = tienda_id;
      console.log("  ✅ Usando tienda del body:", tienda_venta);
    }
    // Si no tiene tienda asignada y no envió tienda_id
    else {
      console.log("  ❌ No se especificó tienda");
      return res.status(400).json({
        message: "Debe especificar de qué tienda se tomará el inventario",
        requiere_tienda: true, // Flag para el frontend (mostrar selector de tienda)
      });
    }

    console.log(
      "  🎯 tienda_venta final:",
      tienda_venta,
      "- Tipo:",
      typeof tienda_venta
    );

    // Verificar que la tienda especificada tenga stock suficiente
    const variantes_ids = items.map((item) => item.variante_id);

    // Primero verificar inventario global
    const { data: variantesGlobal, error: errorGlobal } = await supabase
      .from("variantes_producto")
      .select("id, sku, inventario_global(cantidad_disponible)")
      .in("id", variantes_ids);

    if (errorGlobal) {
      console.error("Error al verificar stock global:", errorGlobal);
      return res.status(500).json({ message: "Error al verificar stock" });
    }

    // Validar stock global
    for (const item of items) {
      const variante = variantesGlobal.find((v) => v.id === item.variante_id);
      if (!variante) {
        return res.status(404).json({
          message: `Variante ${item.variante_id} no encontrada`,
        });
      }

      const stockGlobal = variante.inventario_global?.cantidad_disponible || 0;
      if (stockGlobal < item.cantidad) {
        return res.status(400).json({
          message: `Stock insuficiente para SKU ${variante.sku}. Disponible: ${stockGlobal}, Solicitado: ${item.cantidad}`,
        });
      }
    }

    // Ahora verificar stock en la tienda específica
    const { data: variantesTienda, error: errorTienda } = await supabase
      .from("inventario_tiendas")
      .select("variante_id, cantidad_disponible")
      .in("variante_id", variantes_ids)
      .eq("tienda_id", tienda_venta);

    if (errorTienda) {
      console.error("Error al verificar stock de tienda:", errorTienda);
      return res
        .status(500)
        .json({ message: "Error al verificar stock de tienda" });
    }

    // Validar stock en tienda
    for (const item of items) {
      const inventarioTienda = variantesTienda.find(
        (v) => v.variante_id === item.variante_id
      );
      const variante = variantesGlobal.find((v) => v.id === item.variante_id);

      if (!inventarioTienda) {
        return res.status(400).json({
          message: `El producto ${variante.sku} no tiene inventario registrado en esta tienda`,
        });
      }

      const stockTienda = inventarioTienda.cantidad_disponible || 0;
      if (stockTienda < item.cantidad) {
        return res.status(400).json({
          message: `Stock insuficiente en esta tienda para SKU ${variante.sku}. Disponible en tienda: ${stockTienda}, Solicitado: ${item.cantidad}`,
        });
      }
    }

    // ========================================================================
    // INICIAR TRANSACCIÓN PARA GARANTIZAR CONSISTENCIA DE DATOS
    // ========================================================================
    // Si algo falla durante el proceso, TODA la operación se revierte automáticamente
    // Esto previene estados inconsistentes como: inventario descontado pero venta no creada,
    // o algunos productos descontados pero no todos.

    try {
      // Usar RPC para ejecutar todo en una transacción PostgreSQL
      const { data: resultadoVenta, error: errorTransaccion } =
        await supabase.rpc("crear_venta_transaccional", {
          p_usuario_id: usuario_id,
          p_tienda_id: tienda_id,
          p_cliente_info: cliente_info,
          p_subtotal: subtotal,
          p_descuento: descuento,
          p_impuestos: impuestos,
          p_total: total,
          p_metodo_pago: metodo_pago,
          p_estado_venta: estado_venta,
          p_codigo_descuento_id: codigo_descuento_id,
          p_descuento_aplicado: descuento_aplicado,
          p_notas: notas || null,
          p_items: JSON.stringify(items), // Pasar items como JSON string
        });

      if (errorTransaccion) {
        console.error("❌ Error en transacción de venta:", errorTransaccion);
        return res.status(500).json({
          message: "Error al procesar la venta",
          error: errorTransaccion.message,
        });
      }

      console.log(
        "✅ Venta creada exitosamente con transacción:",
        resultadoVenta
      );

      // El resultado viene como array, tomamos el primer elemento
      const ventaCreada = resultadoVenta[0] || resultadoVenta;

      res.status(201).json({
        message: "Venta creada exitosamente",
        id: ventaCreada.venta_id,
        folio: ventaCreada.folio,
        total: ventaCreada.total,
      });
    } catch (transactionError) {
      // Si la transacción falla, PostgreSQL automáticamente revierte TODOS los cambios
      console.error("❌ Error crítico en transacción:", transactionError);
      res.status(500).json({
        message: "Error al procesar la venta. No se realizaron cambios.",
        error: transactionError.message,
      });
    }
  } catch (error) {
    console.error("Error en POST /ventas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /ventas
 * Obtener ventas con filtros opcionales
 */
router.get("/", async (req, res) => {
  try {
    const {
      fecha_inicio,
      fecha_fin,
      estado,
      metodo_pago,
      tienda_id,
      usuario_id,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("ventas")
      .select(
        `
        *,
        tiendas(nombre, direccion),
        ventas_items(
          *,
          variantes_producto(sku, productos(nombre))
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Aplicar filtros básicos
    if (fecha_inicio) {
      query = query.gte("created_at", fecha_inicio);
    }
    if (fecha_fin) {
      query = query.lte("created_at", fecha_fin);
    }
    if (estado) {
      query = query.eq("estado_venta", estado);
    }
    if (tienda_id) {
      query = query.eq("tienda_id", tienda_id);
    }
    if (usuario_id) {
      query = query.eq("usuario_id", usuario_id);
    }

    // Paginación
    query = query.range(
      parseInt(offset),
      parseInt(offset) + parseInt(limit) - 1
    );

    const { data, error, count } = await query;

    if (error) {
      console.error("Error al obtener ventas:", error);
      return res.status(500).json({ message: "Error al obtener ventas" });
    }

    // Filtrar por método de pago después de obtener los datos
    // porque el campo es JSONB y necesitamos verificar si contiene la llave
    let ventasFiltradas = data;
    if (metodo_pago) {
      ventasFiltradas = data.filter((venta) => {
        if (!venta.metodo_pago || typeof venta.metodo_pago !== "object") {
          return false;
        }
        // Verificar si el método de pago existe como llave en el objeto
        return metodo_pago in venta.metodo_pago;
      });
    }

    res.json({
      data: ventasFiltradas,
      pagination: {
        total: metodo_pago ? ventasFiltradas.length : count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error en GET /ventas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /ventas/buscar-variantes
 * Buscar variantes para agregar al carrito
 * ACTUALIZADO: Busca en inventario_global (muestra todo el inventario disponible)
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id para que no sea capturada por el parámetro dinámico
 */
router.get("/buscar-variantes", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const busqueda = q.trim();

    // Buscar en inventario_global (todo el inventario disponible)
    // Estrategia: Primero buscar coincidencia exacta de SKU, luego por inicio, luego por nombre
    let data = null;
    let error = null;

    // 1. Intentar búsqueda EXACTA por SKU primero
    const resultExacto = await supabase
      .from("variantes_producto")
      .select(
        `
        id,
        sku,
        precio,
        atributos,
        activo,
        productos(id, nombre, categoria_id),
        inventario_global(cantidad_disponible)
      `
      )
      .eq("activo", true)
      .ilike("sku", busqueda)
      .limit(20);

    if (resultExacto.data && resultExacto.data.length > 0) {
      data = resultExacto.data;
      error = resultExacto.error;
    } else {
      // 2. Si no hay coincidencia exacta, buscar por inicio de SKU o nombre de producto
      const resultParcial = await supabase
        .from("variantes_producto")
        .select(
          `
          id,
          sku,
          precio,
          atributos,
          activo,
          productos(id, nombre, categoria_id),
          inventario_global(cantidad_disponible)
        `
        )
        .eq("activo", true)
        .or(`sku.ilike.${busqueda}%,productos.nombre.ilike.%${busqueda}%`)
        .limit(20);

      data = resultParcial.data;
      error = resultParcial.error;
    }

    if (error) {
      console.error("Error al buscar variantes:", error);
      return res.status(500).json({ message: "Error al buscar variantes" });
    }

    // Filtrar solo las que tienen stock global
    const conStock = data.filter((v) => {
      const stock = v.inventario_global?.cantidad_disponible || 0;
      return stock > 0;
    });

    // Si no hay productos con stock, devolver mensaje informativo
    if (conStock.length === 0) {
      return res.status(404).json({
        message: "No hay inventario disponible de ese producto",
        sin_inventario: true,
      });
    }

    // Formatear datos para el frontend
    const variantesFormateadas = conStock.map((v) => ({
      id: v.id,
      sku: v.sku,
      precio: v.precio,
      atributos: v.atributos,
      nombre_producto: v.productos?.nombre || "Producto sin nombre",
      stock_actual: v.inventario_global?.cantidad_disponible || 0,
    }));

    res.json(variantesFormateadas);
  } catch (error) {
    console.error("Error en GET /ventas/buscar-variantes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /ventas/pendientes
 * Obtener ventas pendientes de pago (tickets generados)
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id para evitar conflictos
 */
router.get("/pendientes", async (req, res) => {
  try {
    const { tienda_id } = req.query;
    const usuario_tienda_id = req.user?.tienda_id;

    let query = supabase
      .from("ventas")
      .select(
        `
        id,
        folio,
        total,
        created_at,
        notas,
        tiendas(nombre),
        ventas_items(
          cantidad,
          precio_unitario,
          subtotal_linea,
          variantes_producto(sku, productos(nombre))
        )
      `
      )
      .eq("estado_venta", "pendiente")
      .order("created_at", { ascending: false });

    // Filtrar por tienda si se especifica o si el usuario tiene tienda asignada
    const tienda_filtro = tienda_id || usuario_tienda_id;
    if (tienda_filtro) {
      query = query.eq("tienda_id", tienda_filtro);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener ventas pendientes:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener ventas pendientes" });
    }

    // Obtener información de vendedores para cada venta
    const ventasConVendedor = await Promise.all(
      data.map(async (venta) => {
        if (venta.usuario_id) {
          try {
            const { data: vendedor, error: vendedorError } = await supabase
              .from("usuarios")
              .select("nombre, apellido")
              .eq("id", venta.usuario_id)
              .single();

            if (vendedorError) {
              console.error("Error obteniendo vendedor:", vendedorError);
              return { ...venta, vendedor: "N/A" };
            }

            return {
              ...venta,
              vendedor: vendedor
                ? `${vendedor.nombre} ${vendedor.apellido || ""}`.trim()
                : "N/A",
            };
          } catch (error) {
            console.error("Error en consulta de vendedor:", error);
            return { ...venta, vendedor: "N/A" };
          }
        }
        return { ...venta, vendedor: "N/A" };
      })
    );

    res.json(ventasConVendedor);
  } catch (error) {
    console.error("Error en GET /ventas/pendientes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /ventas/:id
 * Obtener una venta por ID con todos sus detalles
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("ventas")
      .select(
        `
        *,
        tiendas(nombre, direccion),
        ventas_items(
          *,
          variantes_producto(
            sku, 
            precio,
            atributos,
            productos(nombre, descripcion)
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error al obtener venta:", error);
      if (error.code === "PGRST116") {
        return res.status(404).json({ message: "Venta no encontrada" });
      }
      return res.status(500).json({ message: "Error al obtener la venta" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error en GET /ventas/:id:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * PUT /ventas/:id/cancelar
 * Cancelar una venta y restaurar inventario
 */
router.put("/:id/cancelar", async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuario_id = req.user.id;

    // Obtener la venta con sus items
    const { data: venta, error: errorVenta } = await supabase
      .from("ventas")
      .select(
        `
        *,
        ventas_items(*)
      `
      )
      .eq("id", id)
      .single();

    if (errorVenta) {
      console.error("Error al obtener venta:", errorVenta);
      if (errorVenta.code === "PGRST116") {
        return res.status(404).json({ message: "Venta no encontrada" });
      }
      return res.status(500).json({ message: "Error al obtener la venta" });
    }

    // Verificar que la venta no esté ya cancelada
    if (venta.estado_venta === "cancelada") {
      return res.status(400).json({ message: "La venta ya está cancelada" });
    }

    // Actualizar estado de la venta
    const { error: errorUpdate } = await supabase
      .from("ventas")
      .update({
        estado_venta: "cancelada",
        notas: motivo ? `Cancelada: ${motivo}` : "Cancelada",
      })
      .eq("id", id);

    if (errorUpdate) {
      console.error("Error al cancelar venta:", errorUpdate);
      return res.status(500).json({ message: "Error al cancelar la venta" });
    }

    // Restaurar inventario en la tienda y en global
    for (const item of venta.ventas_items) {
      // Restaurar en inventario_tiendas
      const { data: invTienda } = await supabase
        .from("inventario_tiendas")
        .select("cantidad_disponible")
        .eq("variante_id", item.variante_id)
        .eq("tienda_id", venta.tienda_id)
        .single();

      if (invTienda) {
        await supabase
          .from("inventario_tiendas")
          .update({
            cantidad_disponible: invTienda.cantidad_disponible + item.cantidad,
          })
          .eq("variante_id", item.variante_id)
          .eq("tienda_id", venta.tienda_id);
      }

      // Restaurar en inventario_global
      const { data: invGlobal } = await supabase
        .from("inventario_global")
        .select("cantidad_disponible")
        .eq("variante_id", item.variante_id)
        .single();

      if (invGlobal) {
        await supabase
          .from("inventario_global")
          .update({
            cantidad_disponible: invGlobal.cantidad_disponible + item.cantidad,
          })
          .eq("variante_id", item.variante_id);
      }

      // Registrar movimiento de inventario
      await supabase.from("movimientos_inventario").insert({
        variante_id: item.variante_id,
        tienda_id: venta.tienda_id,
        tipo_movimiento: "entrada",
        cantidad: item.cantidad,
        usuario_id: usuario_id,
        motivo: `Cancelación de venta #${venta.folio || venta.id}${
          motivo ? `: ${motivo}` : ""
        }`,
      });
    }

    res.json({
      message: "Venta cancelada exitosamente",
      id: venta.id,
      folio: venta.folio,
    });
  } catch (error) {
    console.error("Error en PUT /ventas/:id/cancelar:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /ventas/folio/:folio
 * Buscar una venta por folio
 */
router.get("/folio/:folio", async (req, res) => {
  try {
    const { folio } = req.params;

    const { data, error } = await supabase
      .from("ventas")
      .select(
        `
        *,
        tiendas(nombre, direccion),
        ventas_items(
          *,
          variantes_producto(
            sku, 
            precio,
            atributos,
            imagen_url,
            imagen_thumbnail_url,
            productos(nombre, descripcion)
          )
        )
      `
      )
      .eq("folio", folio)
      .single();

    if (error) {
      console.error("Error al obtener venta por folio:", error);
      if (error.code === "PGRST116") {
        return res.status(404).json({ message: "Venta no encontrada" });
      }
      return res.status(500).json({ message: "Error al obtener la venta" });
    }

    // Obtener información del vendedor
    if (data.usuario_id) {
      try {
        const { data: vendedor, error: vendedorError } = await supabase
          .from("usuarios")
          .select("nombre, apellido")
          .eq("id", data.usuario_id)
          .single();

        if (vendedorError) {
          console.error("Error obteniendo vendedor:", vendedorError);
          data.vendedor = "N/A";
        } else {
          data.vendedor = vendedor
            ? `${vendedor.nombre} ${vendedor.apellido || ""}`.trim()
            : "N/A";
        }
      } catch (error) {
        console.error("Error en consulta de vendedor:", error);
        data.vendedor = "N/A";
      }
    } else {
      data.vendedor = "N/A";
    }

    res.json(data);
  } catch (error) {
    console.error("Error en GET /ventas/folio/:folio:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * PUT /ventas/:id/cobrar
 * Cobrar una venta pendiente (procesar ticket)
 * Descuenta el inventario y actualiza el estado a 'completada'
 */
router.put("/:id/cobrar", async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo_pago } = req.body;
    const cajero_id = req.user?.id;

    // Validaciones
    if (!metodo_pago) {
      return res
        .status(400)
        .json({ message: "El método de pago es requerido" });
    }

    console.log(`💰 Cobrando venta ${id} - Cajero: ${cajero_id}`);

    // Usar RPC para ejecutar todo en una transacción PostgreSQL
    const { data: resultado, error: errorTransaccion } = await supabase.rpc(
      "cobrar_venta_pendiente",
      {
        p_venta_id: id,
        p_cajero_id: cajero_id,
        p_metodo_pago: metodo_pago,
      }
    );

    if (errorTransaccion) {
      console.error("❌ Error al cobrar venta:", errorTransaccion);
      return res.status(500).json({
        message: "Error al procesar el cobro",
        error: errorTransaccion.message,
      });
    }

    console.log("✅ Venta cobrada exitosamente:", resultado);

    res.json({
      message: "Ticket cobrado exitosamente",
      folio: resultado[0]?.folio,
      total: resultado[0]?.total,
    });
  } catch (error) {
    console.error("Error en PUT /ventas/:id/cobrar:", error);
    res.status(500).json({
      message: "Error al procesar el cobro. No se realizaron cambios.",
      error: error.message,
    });
  }
});

export default router;
