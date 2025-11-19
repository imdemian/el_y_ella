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

    // Si el usuario tiene tienda asignada, usar esa
    if (usuario_tienda_id) {
      tienda_venta = usuario_tienda_id;
    }
    // Si NO tiene tienda, DEBE especificar tienda_id en el body
    else if (tienda_id) {
      tienda_venta = tienda_id;
    }
    // Si no tiene tienda asignada y no envió tienda_id
    else {
      return res.status(400).json({
        message: "Debe especificar de qué tienda se tomará el inventario",
        requiere_tienda: true, // Flag para el frontend (mostrar selector de tienda)
      });
    }

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

    // Crear la venta (AHORA INCLUYE TIENDA_ID Y CÓDIGO DE DESCUENTO)
    const { data: venta, error: errorVenta } = await supabase
      .from("ventas")
      .insert({
        usuario_id: usuario_id,
        tienda_id: tienda_venta, // AGREGADO: Registrar tienda de la venta
        cliente_info: cliente_info, // JSONB con datos del cliente (puede ser null)
        subtotal: subtotal,
        descuento: descuento,
        impuestos: impuestos,
        total: total,
        metodo_pago: metodo_pago, // JSONB: ej. {"efectivo": 500} o {"tarjeta": 1000}
        estado_venta: estado_venta, // 'completada', 'apartado', 'cancelada'
        codigo_descuento_id: codigo_descuento_id, // ID del código de descuento
        descuento_aplicado: descuento_aplicado, // Monto del descuento
        notas: notas || null,
      })
      .select()
      .single();

    if (errorVenta) {
      console.error("Error al crear venta:", errorVenta);
      return res.status(500).json({ message: "Error al crear la venta" });
    }

    // Si se aplicó un descuento, registrar su uso
    if (codigo_descuento_id && descuento_aplicado > 0) {
      try {
        // Registrar uso del descuento
        const { error: errorUsoDescuento } = await supabase
          .from("uso_descuentos")
          .insert({
            codigo_descuento_id: codigo_descuento_id,
            venta_id: venta.id,
            cliente_info: cliente_info,
            monto_descuento: descuento_aplicado,
          });

        if (errorUsoDescuento) {
          console.error(
            "Error al registrar uso de descuento:",
            errorUsoDescuento
          );
          // No fallar la venta, solo registrar el error
        }

        // Incrementar contador de usos del código de descuento
        const { data: descuento, error: errorDescuento } = await supabase
          .from("codigos_descuento")
          .select("usos_actuales")
          .eq("id", codigo_descuento_id)
          .single();

        if (!errorDescuento && descuento) {
          await supabase
            .from("codigos_descuento")
            .update({ usos_actuales: (descuento.usos_actuales || 0) + 1 })
            .eq("id", codigo_descuento_id);
        }
      } catch (descuentoError) {
        console.error("Error procesando descuento:", descuentoError);
        // Continuar con la venta aunque falle el registro del descuento
      }
    }

    // Crear items de venta
    const itemsVenta = items.map((item) => ({
      venta_id: venta.id,
      variante_id: item.variante_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      descuento_item: 0,
      subtotal_linea: item.subtotal,
    }));

    const { error: errorItems } = await supabase
      .from("ventas_items")
      .insert(itemsVenta);

    if (errorItems) {
      console.error("Error al crear items de venta:", errorItems);
      // Revertir la venta
      await supabase.from("ventas").delete().eq("id", venta.id);
      return res.status(500).json({ message: "Error al crear items de venta" });
    }

    // Actualizar inventario SOLO EN LA TIENDA ESPECÍFICA
    for (const item of items) {
      // Obtener stock actual de la tienda (de los datos ya consultados)
      const invTienda = variantesTienda.find(
        (it) => it.variante_id === item.variante_id
      );
      const stockActualTienda = invTienda?.cantidad_disponible || 0;
      const nuevoStockTienda = stockActualTienda - item.cantidad;

      // Actualizar inventario_tiendas
      const { error: errorInventarioTienda } = await supabase
        .from("inventario_tiendas")
        .update({ cantidad_disponible: nuevoStockTienda })
        .eq("variante_id", item.variante_id)
        .eq("tienda_id", tienda_venta);

      if (errorInventarioTienda) {
        console.error(
          "Error al actualizar inventario de tienda:",
          errorInventarioTienda
        );
      }

      // OPCIONAL: Registrar movimiento de inventario para auditoría
      await supabase.from("movimientos_inventario").insert({
        variante_id: item.variante_id,
        tienda_id: tienda_venta,
        tipo_movimiento: "salida",
        cantidad: item.cantidad,
        usuario_id: usuario_id,
        motivo: `Venta #${venta.folio || venta.id}`,
      });
    }

    res.status(201).json({
      message: "Venta creada exitosamente",
      id: venta.id,
      folio: venta.folio,
      total: venta.total,
    });
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

export default router;
