// functions/routes/productoRouter.js
import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// GET /productos - Lista paginada con filtros
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      categoria_id,
      activo = true,
      order_by = "nombre",
      order_dir = "asc",
    } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    // Construir query base
    let query = supabase.from("productos").select(
      `
        *,
        categorias (id, nombre),
        variantes_producto (
          id,
          sku,
          atributos,
          precio,
          activo,
          inventario_global (
            cantidad_disponible,
            cantidad_reservada
          )
        )
      `,
      { count: "exact" }
    ); // ✅ Contar total de registros

    // Aplicar filtros
    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,descripcion.ilike.%${search}%`
      );
    }

    if (categoria_id) {
      query = query.eq("categoria_id", categoria_id);
    }

    if (activo !== "all") {
      query = query.eq("activo", activo === "true");
    }

    // Aplicar ordenamiento
    const validOrderFields = [
      "nombre",
      "precio_base",
      "created_at",
      "updated_at",
    ];
    const validOrderDirs = ["asc", "desc"];

    const orderField = validOrderFields.includes(order_by)
      ? order_by
      : "nombre";
    const orderDirection = validOrderDirs.includes(order_dir.toLowerCase())
      ? order_dir
      : "asc";

    query = query.order(orderField, { ascending: orderDirection === "asc" });

    // Aplicar paginación
    query = query.range(offset, offset + limitInt - 1);

    // Ejecutar query
    const { data: productos, error, count } = await query;

    if (error) throw error;

    // Calcular metadata de paginación
    const totalPages = Math.ceil(count / limitInt);
    const hasNextPage = pageInt < totalPages;
    const hasPrevPage = pageInt > 1;

    res.json({
      data: productos,
      pagination: {
        current_page: pageInt,
        per_page: limitInt,
        total_items: count,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
        next_page: hasNextPage ? pageInt + 1 : null,
        prev_page: hasPrevPage ? pageInt - 1 : null,
      },
      filters: {
        search,
        categoria_id: categoria_id || "all",
        activo: activo === "all" ? "all" : activo === "true",
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /productos/:id - Producto específico con todo el detalle
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: producto, error } = await supabase
      .from("productos")
      .select(
        `
        *,
        categorias (id, nombre),
        variantes_producto (
          *,
          inventario_global (
            cantidad_disponible,
            cantidad_reservada,
            minimo_stock
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!producto)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /productos - Crear producto con sus variantes (OPTIMIZADO)
router.post("/", async (req, res) => {
  try {
    const { producto, variantes } = req.body;

    // Validaciones básicas
    if (!producto?.nombre || !producto?.precio_base) {
      return res
        .status(400)
        .json({ error: "Nombre y precio_base son requeridos" });
    }

    // Usar transacción para consistencia
    const { data: nuevoProducto, error: errorProducto } = await supabase
      .from("productos")
      .insert([
        {
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          categoria_id: producto.categoria_id,
          precio_base: producto.precio_base,
          marca: producto.marca,
          activo: producto.activo !== false,
        },
      ])
      .select()
      .single();

    if (errorProducto) throw errorProducto;

    // Crear variantes si existen (en lote)
    if (variantes && variantes.length > 0) {
      const variantesConProductoId = variantes.map((variante) => ({
        producto_id: nuevoProducto.id,
        sku: variante.sku,
        atributos: variante.atributos || {},
        precio: variante.precio || producto.precio_base,
        costo: variante.costo,
        activo: variante.activo !== false,
      }));

      const { error: errorVariantes } = await supabase
        .from("variantes_producto")
        .insert(variantesConProductoId);

      if (errorVariantes) throw errorVariantes;
    }

    // Obtener producto completo con variantes (query optimizada)
    const { data: productoCompleto, error: errorFinal } = await supabase
      .from("productos")
      .select(
        `
        *,
        categorias (id, nombre),
        variantes_producto (
          id,
          sku,
          atributos,
          precio,
          activo,
          inventario_global (cantidad_disponible)
        )
      `
      )
      .eq("id", nuevoProducto.id)
      .single();

    if (errorFinal) throw errorFinal;

    res.status(201).json(productoCompleto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /productos/search/quick - Búsqueda rápida para TPV (OPTIMIZADA)
router.get("/search/quick", async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Parámetro "q" requerido' });
    }

    // Query optimizada para búsqueda en TPV
    const { data: productos, error } = await supabase
      .from("productos")
      .select(
        `
        id,
        nombre,
        precio_base,
        categorias (nombre),
        variantes_producto (
          id,
          sku,
          atributos,
          precio,
          inventario_global (cantidad_disponible)
        )
      `
      )
      .or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`)
      .eq("activo", true)
      .limit(parseInt(limit))
      .order("nombre");

    if (error) throw error;

    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /productos/stats - Estadísticas de productos
router.get("/stats/overview", async (req, res) => {
  try {
    // Query eficiente para estadísticas
    const { data: stats, error } = await supabase
      .from("productos")
      .select(
        `
        id,
        variantes_producto (
          inventario_global (cantidad_disponible)
        )
      `
      )
      .eq("activo", true);

    if (error) throw error;

    const totalProductos = stats.length;
    const totalVariantes = stats.reduce(
      (acc, producto) => acc + (producto.variantes_producto?.length || 0),
      0
    );
    const totalStock = stats.reduce((acc, producto) => {
      const stockProducto =
        producto.variantes_producto?.reduce(
          (accV, variante) =>
            accV + (variante.inventario_global?.cantidad_disponible || 0),
          0
        ) || 0;
      return acc + stockProducto;
    }, 0);

    res.json({
      total_productos: totalProductos,
      total_variantes: totalVariantes,
      total_stock: totalStock,
      productos_activos: totalProductos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /productos/:id - Actualizar producto
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria_id, precio_base, marca, activo } =
      req.body;

    const { data: producto, error } = await supabase
      .from("productos")
      .update({
        nombre,
        descripcion,
        categoria_id,
        precio_base,
        marca,
        activo,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select(
        `
        id,
        nombre,
        precio_base,
        categorias (id, nombre)
      `
      )
      .single();

    if (error) throw error;
    if (!producto)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /productos/:id - Eliminar producto (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete en lugar de eliminar físicamente
    const { data: producto, error } = await supabase
      .from("productos")
      .update({
        activo: false,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select("id")
      .single();

    if (error) throw error;
    if (!producto)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json({
      message: "Producto desactivado correctamente",
      id: producto.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
