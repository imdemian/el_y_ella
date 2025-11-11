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
      total,
      metodo_pago,
      monto_pagado,
      cliente_id,
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

    // Crear la venta (AHORA INCLUYE TIENDA_ID)
    const { data: venta, error: errorVenta } = await supabase
      .from("ventas")
      .insert({
        usuario_id: usuario_id,
        tienda_id: tienda_venta, // AGREGADO: Registrar tienda de la venta
        cliente_id: cliente_id || null,
        subtotal: subtotal,
        total: total,
        metodo_pago: metodo_pago,
        monto_pagado: monto_pagado || total,
        estado: "completada",
        notas: notas || null,
      })
      .select()
      .single();

    if (errorVenta) {
      console.error("Error al crear venta:", errorVenta);
      return res.status(500).json({ message: "Error al crear la venta" });
    }

    // Crear items de venta
    const itemsVenta = items.map((item) => ({
      venta_id: venta.id,
      variante_id: item.variante_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
    }));

    const { error: errorItems } = await supabase
      .from("items_venta")
      .insert(itemsVenta);

    if (errorItems) {
      console.error("Error al crear items de venta:", errorItems);
      // Revertir la venta
      await supabase.from("ventas").delete().eq("id", venta.id);
      return res.status(500).json({ message: "Error al crear items de venta" });
    }

    // Actualizar inventario EN LA TIENDA ESPECÍFICA Y EN GLOBAL
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

      // Obtener stock actual global (de los datos ya consultados)
      const invGlobal = variantesGlobal.find(
        (vg) => vg.id === item.variante_id
      );
      const stockActualGlobal =
        invGlobal?.inventario_global?.cantidad_disponible || 0;
      const nuevoStockGlobal = stockActualGlobal - item.cantidad;

      // Actualizar inventario_global
      const { error: errorInventarioGlobal } = await supabase
        .from("inventario_global")
        .update({ cantidad_disponible: nuevoStockGlobal })
        .eq("variante_id", item.variante_id);

      if (errorInventarioGlobal) {
        console.error(
          "Error al actualizar inventario global:",
          errorInventarioGlobal
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
      limit = 50,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("ventas")
      .select(
        `
        *,
        usuarios(nombre, email),
        clientes(nombre, telefono),
        items_venta(
          *,
          variantes_producto(sku, productos(nombre))
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Aplicar filtros
    if (fecha_inicio) {
      query = query.gte("created_at", fecha_inicio);
    }
    if (fecha_fin) {
      query = query.lte("created_at", fecha_fin);
    }
    if (estado) {
      query = query.eq("estado", estado);
    }
    if (metodo_pago) {
      query = query.eq("metodo_pago", metodo_pago);
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

    res.json({
      data,
      pagination: {
        total: count,
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

    res.json(conStock);
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
        usuarios(nombre, email),
        clientes(nombre, telefono),
        tiendas(nombre, direccion),
        items_venta(
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
        items_venta(*)
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
    if (venta.estado === "cancelada") {
      return res.status(400).json({ message: "La venta ya está cancelada" });
    }

    // Actualizar estado de la venta
    const { error: errorUpdate } = await supabase
      .from("ventas")
      .update({
        estado: "cancelada",
        notas: motivo ? `Cancelada: ${motivo}` : "Cancelada",
      })
      .eq("id", id);

    if (errorUpdate) {
      console.error("Error al cancelar venta:", errorUpdate);
      return res.status(500).json({ message: "Error al cancelar la venta" });
    }

    // Restaurar inventario en la tienda y en global
    for (const item of venta.items_venta) {
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
