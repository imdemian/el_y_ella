// routes/apartadosRouter.js
import express from "express";
import { supabaseAdmin as supabase } from "../config/supabase.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * GET /apartados
 * Obtener lista de apartados con filtros
 */
router.get("/", async (req, res) => {
  try {
    const {
      estado,
      tienda_id,
      fecha_inicio,
      fecha_fin,
      busqueda,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("apartados")
      .select(
        `
        *,
        tiendas(nombre),
        usuarios(nombre, apellido),
        apartados_items(count),
        apartados_abonos(count)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Filtros
    if (estado) {
      query = query.eq("estado", estado);
    }
    if (tienda_id) {
      query = query.eq("tienda_id", tienda_id);
    }
    if (fecha_inicio) {
      query = query.gte("created_at", fecha_inicio);
    }
    if (fecha_fin) {
      query = query.lte("created_at", fecha_fin);
    }
    if (busqueda) {
      query = query.or(
        `folio.ilike.%${busqueda}%,cliente_info->nombre.ilike.%${busqueda}%,cliente_info->telefono.ilike.%${busqueda}%`
      );
    }

    // Paginación
    query = query.range(
      parseInt(offset),
      parseInt(offset) + parseInt(limit) - 1
    );

    const { data, error, count } = await query;

    if (error) {
      console.error("Error al obtener apartados:", error);
      return res.status(500).json({ message: "Error al obtener apartados" });
    }

    // Calcular saldo pendiente para cada apartado
    const apartadosConSaldo = data.map((apt) => ({
      ...apt,
      saldo_pendiente: apt.total - apt.total_abonado,
    }));

    res.json({
      data: apartadosConSaldo,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error en GET /apartados:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /apartados/catalogo-arreglos
 * Obtener catálogo de arreglos disponibles
 */
router.get("/catalogo-arreglos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("catalogo_arreglos")
      .select("*")
      .eq("activo", true)
      .order("nombre");

    if (error) {
      console.error("Error al obtener catálogo de arreglos:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener catálogo de arreglos" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error en GET /apartados/catalogo-arreglos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /apartados/:id
 * Obtener detalle de un apartado
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("apartados")
      .select(
        `
        *,
        tiendas(id, nombre, direccion),
        usuarios(id, nombre, apellido),
        apartados_items(
          *,
          variantes_producto(
            id,
            sku,
            precio,
            atributos,
            productos(nombre, descripcion)
          )
        ),
        apartados_abonos(
          *,
          ventas(folio),
          cajero:usuarios(nombre, apellido)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error al obtener apartado:", error);
      if (error.code === "PGRST116") {
        return res.status(404).json({ message: "Apartado no encontrado" });
      }
      return res.status(500).json({ message: "Error al obtener apartado" });
    }

    // Calcular saldo pendiente
    data.saldo_pendiente = data.total - data.total_abonado;

    // Mapear apartados_items a items para el frontend
    // y transformar los campos para que coincidan con lo que espera el frontend
    data.items = (data.apartados_items || []).map((item) => ({
      id: item.id,
      tipo_item: item.tipo,
      producto_variante_id: item.variante_id,
      producto_nombre:
        item.descripcion ||
        item.variantes_producto?.productos?.nombre ||
        "Sin nombre",
      sku: item.variantes_producto?.sku || null,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      medidas: item.medidas,
      descripcion_arreglo: item.notas,
      variante: item.variantes_producto,
    }));

    // Mapear apartados_abonos a abonos
    data.abonos = data.apartados_abonos || [];

    res.json(data);
  } catch (error) {
    console.error("Error en GET /apartados/:id:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /apartados/folio/:folio
 * Buscar apartado por folio
 */
router.get("/folio/:folio", async (req, res) => {
  try {
    const { folio } = req.params;

    const { data, error } = await supabase
      .from("apartados")
      .select(
        `
        *,
        tiendas(id, nombre),
        usuarios(id, nombre, apellido),
        apartados_items(*),
        apartados_abonos(*, ventas(folio))
      `
      )
      .eq("folio", folio)
      .single();

    if (error) {
      console.error("Error al buscar apartado:", error);
      if (error.code === "PGRST116") {
        return res.status(404).json({ message: "Apartado no encontrado" });
      }
      return res.status(500).json({ message: "Error al buscar apartado" });
    }

    data.saldo_pendiente = data.total - data.total_abonado;

    // Mapear apartados_items a items para el frontend
    data.items = (data.apartados_items || []).map((item) => ({
      id: item.id,
      tipo_item: item.tipo,
      producto_variante_id: item.variante_id,
      producto_nombre: item.descripcion || "Sin nombre",
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      medidas: item.medidas,
      descripcion_arreglo: item.notas,
    }));

    // Mapear apartados_abonos a abonos
    data.abonos = data.apartados_abonos || [];

    res.json(data);
  } catch (error) {
    console.error("Error en GET /apartados/folio/:folio:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * POST /apartados
 * Crear un nuevo apartado
 */
router.post("/", async (req, res) => {
  try {
    const {
      cliente_info,
      items,
      fecha_entrega_estimada,
      notas,
      tienda_id,
      anticipo = null, // Primer abono opcional
      metodo_pago_anticipo = null,
    } = req.body;
    const usuario_id = req.user?.id;
    const usuario_tienda_id = req.user?.tienda_id;

    // Validaciones
    if (!cliente_info || !cliente_info.nombre) {
      return res
        .status(400)
        .json({ message: "El nombre del cliente es requerido" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Debe incluir al menos un item en el apartado" });
    }

    // Determinar tienda
    const tienda_apartado = tienda_id || usuario_tienda_id;
    if (!tienda_apartado) {
      return res.status(400).json({ message: "Debe especificar la tienda" });
    }

    // Calcular total
    const total = items.reduce((sum, item) => {
      return sum + item.precio_unitario * item.cantidad;
    }, 0);

    // Crear apartado
    const { data: apartado, error: errorApartado } = await supabase
      .from("apartados")
      .insert({
        cliente_info,
        usuario_id,
        tienda_id: tienda_apartado,
        total,
        fecha_entrega_estimada,
        notas,
      })
      .select()
      .single();

    if (errorApartado) {
      console.error("Error al crear apartado:", errorApartado);
      return res.status(500).json({ message: "Error al crear el apartado" });
    }

    // Crear items
    // Mapeo de campos del frontend al backend:
    // tipo_item -> tipo, producto_variante_id -> variante_id
    // producto_nombre -> descripcion, descripcion_arreglo -> notas
    const itemsConApartadoId = items.map((item) => ({
      apartado_id: apartado.id,
      tipo: item.tipo_item || item.tipo || "producto",
      variante_id: item.producto_variante_id || item.variante_id || null,
      descripcion: item.producto_nombre || item.descripcion || null,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.precio_unitario * item.cantidad,
      medidas: item.medidas || null,
      notas: item.descripcion_arreglo || item.notas || null,
    }));

    const { error: errorItems } = await supabase
      .from("apartados_items")
      .insert(itemsConApartadoId);

    if (errorItems) {
      console.error("Error al crear items:", errorItems);
      // Eliminar apartado si fallan los items
      await supabase.from("apartados").delete().eq("id", apartado.id);
      return res
        .status(500)
        .json({ message: "Error al crear los items del apartado" });
    }

    // Si hay anticipo, registrarlo
    let abonoInfo = null;
    if (anticipo && anticipo > 0 && metodo_pago_anticipo) {
      const { data: resultadoAbono, error: errorAbono } = await supabase.rpc(
        "registrar_abono_apartado",
        {
          p_apartado_id: apartado.id,
          p_monto: anticipo,
          p_metodo_pago: metodo_pago_anticipo,
          p_cajero_id: usuario_id,
          p_tienda_id: tienda_apartado,
          p_notas: "Anticipo inicial",
        }
      );

      if (errorAbono) {
        console.error("Error al registrar anticipo:", errorAbono);
        // No fallamos, el apartado ya está creado
      } else {
        abonoInfo = resultadoAbono[0];
      }
    }

    console.log("✅ Apartado creado:", apartado.folio);

    res.status(201).json({
      message: "Apartado creado exitosamente",
      apartado: {
        id: apartado.id,
        folio: apartado.folio,
        total: apartado.total,
        total_abonado: abonoInfo?.nuevo_total_abonado || 0,
        saldo_pendiente: abonoInfo?.saldo_pendiente || total,
      },
      abono: abonoInfo,
    });
  } catch (error) {
    console.error("Error en POST /apartados:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * POST /apartados/:id/abono
 * Registrar un abono a un apartado
 */
router.post("/:id/abono", async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, metodo_pago, notas } = req.body;
    const cajero_id = req.user?.id;
    const tienda_id = req.user?.tienda_id;

    // Validaciones
    if (!monto || monto <= 0) {
      return res.status(400).json({ message: "El monto debe ser mayor a 0" });
    }

    if (!metodo_pago) {
      return res
        .status(400)
        .json({ message: "El método de pago es requerido" });
    }

    // Obtener tienda del apartado si el usuario no tiene tienda asignada
    let tienda_abono = tienda_id;
    if (!tienda_abono) {
      const { data: apartado } = await supabase
        .from("apartados")
        .select("tienda_id")
        .eq("id", id)
        .single();
      tienda_abono = apartado?.tienda_id;
    }

    // Usar función transaccional
    const { data: resultado, error } = await supabase.rpc(
      "registrar_abono_apartado",
      {
        p_apartado_id: parseInt(id),
        p_monto: monto,
        p_metodo_pago: metodo_pago,
        p_cajero_id: cajero_id,
        p_tienda_id: tienda_abono,
        p_notas: notas || null,
      }
    );

    if (error) {
      console.error("Error al registrar abono:", error);
      return res.status(500).json({
        message: error.message || "Error al registrar el abono",
      });
    }

    const abono = resultado[0];

    console.log("✅ Abono registrado:", abono);

    res.status(201).json({
      message: "Abono registrado exitosamente",
      abono: {
        id: abono.abono_id,
        folio: abono.abono_folio,
        monto,
        venta_id: abono.venta_id,
        venta_folio: abono.venta_folio,
      },
      apartado: {
        total_abonado: abono.nuevo_total_abonado,
        saldo_pendiente: abono.saldo_pendiente,
      },
    });
  } catch (error) {
    console.error("Error en POST /apartados/:id/abono:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * PUT /apartados/:id
 * Actualizar un apartado (con soporte para items)
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_info, fecha_entrega_estimada, notas, estado, items } =
      req.body;

    // Verificar que el apartado existe
    const { data: apartadoExistente, error: errorBuscar } = await supabase
      .from("apartados")
      .select("*")
      .eq("id", id)
      .single();

    if (errorBuscar || !apartadoExistente) {
      return res.status(404).json({ message: "Apartado no encontrado" });
    }

    // No permitir modificar apartados entregados o cancelados
    if (
      apartadoExistente.estado === "entregado" ||
      apartadoExistente.estado === "cancelado"
    ) {
      return res.status(400).json({
        message: `No se puede modificar un apartado con estado: ${apartadoExistente.estado}`,
      });
    }

    // Si se proporcionan items, actualizar total
    let nuevoTotal = apartadoExistente.total;
    if (items && Array.isArray(items)) {
      nuevoTotal = items.reduce((sum, item) => {
        return sum + item.precio_unitario * item.cantidad;
      }, 0);

      // Actualizar items: eliminar todos y recrear
      // Primero eliminar items existentes
      const { error: errorEliminar } = await supabase
        .from("apartados_items")
        .delete()
        .eq("apartado_id", id);

      if (errorEliminar) {
        console.error("Error al eliminar items:", errorEliminar);
        return res
          .status(500)
          .json({ message: "Error al actualizar los items" });
      }

      // Crear nuevos items
      const itemsConApartadoId = items.map((item) => ({
        apartado_id: id,
        tipo: item.tipo_item || item.tipo || "producto",
        variante_id: item.producto_variante_id || item.variante_id || null,
        descripcion: item.producto_nombre || item.descripcion || null,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.precio_unitario * item.cantidad,
        medidas: item.medidas || null,
        notas: item.descripcion_arreglo || item.notas || null,
      }));

      const { error: errorItems } = await supabase
        .from("apartados_items")
        .insert(itemsConApartadoId);

      if (errorItems) {
        console.error("Error al crear items:", errorItems);
        return res
          .status(500)
          .json({ message: "Error al actualizar los items" });
      }
    }

    // Preparar actualización del apartado
    const updates = { total: nuevoTotal };
    if (cliente_info) updates.cliente_info = cliente_info;
    if (fecha_entrega_estimada)
      updates.fecha_entrega_estimada = fecha_entrega_estimada;
    if (notas !== undefined) updates.notas = notas;
    if (estado) {
      // Si se marca como entregado, registrar fecha
      if (estado === "entregado") {
        updates.fecha_entrega_real = new Date().toISOString();
      }
      updates.estado = estado;
    }

    const { data, error } = await supabase
      .from("apartados")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar apartado:", error);
      return res.status(500).json({ message: "Error al actualizar apartado" });
    }

    res.json({
      message: "Apartado actualizado exitosamente",
      apartado: data,
    });
  } catch (error) {
    console.error("Error en PUT /apartados/:id:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * PUT /apartados/:id/estado
 * Cambiar estado de un apartado
 */
router.put("/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = [
      "activo",
      "pagado",
      "listo",
      "entregado",
      "cancelado",
    ];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        message: `Estado inválido. Valores permitidos: ${estadosValidos.join(
          ", "
        )}`,
      });
    }

    const updates = { estado };
    if (estado === "entregado") {
      updates.fecha_entrega_real = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("apartados")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error al cambiar estado:", error);
      return res.status(500).json({ message: "Error al cambiar estado" });
    }

    res.json({
      message: `Estado cambiado a: ${estado}`,
      apartado: data,
    });
  } catch (error) {
    console.error("Error en PUT /apartados/:id/estado:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * GET /apartados/:id/abonos
 * Obtener historial de abonos de un apartado
 */
router.get("/:id/abonos", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("apartados_abonos")
      .select(
        `
        *,
        ventas(folio, created_at),
        cajero:usuarios(nombre, apellido)
      `
      )
      .eq("apartado_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener abonos:", error);
      return res.status(500).json({ message: "Error al obtener abonos" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error en GET /apartados/:id/abonos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
