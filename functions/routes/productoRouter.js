// functions/routes/productoRouter.js
import express from "express";
import { supabaseAdmin as supabase } from "../config/supabase.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

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
          imagen_url,
          imagen_thumbnail_url,
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

    if (error) {
      console.error("Error al obtener productos:", error.message);
      throw error;
    }

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
    console.error("Error en GET /productos:", error.message);
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

    if (error) {
      console.error("Error al obtener producto:", error.message);
      throw error;
    }
    if (!producto)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json(producto);
  } catch (error) {
    console.error("Error en GET /productos/:id:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /productos - Crear producto con sus variantes (OPTIMIZADO)
router.post("/", requireRole(["admin", "manager"]), async (req, res) => {
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
          imagen_url: producto.imagen_url || null,
          imagen_thumbnail_url: producto.imagen_thumbnail_url || null,
        },
      ])
      .select()
      .single();

    if (errorProducto) {
      console.error("Error al crear producto:", errorProducto.message);
      throw errorProducto;
    }

    // Crear variantes si existen (en lote)
    if (variantes && variantes.length > 0) {
      const variantesConProductoId = variantes.map((variante) => ({
        producto_id: nuevoProducto.id,
        sku: variante.sku,
        atributos: variante.atributos || {},
        precio: variante.precio || producto.precio_base,
        costo: variante.costo,
        activo: variante.activo !== false,
        imagen_url: variante.imagen_url || null,
        imagen_thumbnail_url: variante.imagen_thumbnail_url || null,
      }));

      const { error: errorVariantes } = await supabase
        .from("variantes_producto")
        .insert(variantesConProductoId);

      if (errorVariantes) {
        console.error("Error al crear variantes:", errorVariantes.message);
        throw errorVariantes;
      }
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
          imagen_url,
          imagen_thumbnail_url,
          inventario_global (cantidad_disponible)
        )
      `
      )
      .eq("id", nuevoProducto.id)
      .single();

    if (errorFinal) {
      console.error("Error al obtener producto completo:", errorFinal.message);
      throw errorFinal;
    }

    res.status(201).json(productoCompleto);
  } catch (error) {
    console.error("Error en POST /productos:", error.message);
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
        imagen_url,
        imagen_thumbnail_url,
        categorias (nombre),
        variantes_producto (
          id,
          sku,
          atributos,
          precio,
          imagen_url,
          imagen_thumbnail_url,
          inventario_global (cantidad_disponible)
        )
      `
      )
      .or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`)
      .eq("activo", true)
      .limit(parseInt(limit))
      .order("nombre");

    if (error) {
      console.error("Error en búsqueda rápida:", error.message);
      throw error;
    }

    res.json(productos);
  } catch (error) {
    console.error("Error en GET /productos/search/quick:", error.message);
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

    if (error) {
      console.error("Error al obtener estadísticas:", error.message);
      throw error;
    }

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
    console.error("Error en GET /productos/stats/overview:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /productos/:id - Actualizar producto con variantes
router.put("/:id", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      categoria_id,
      precio_base,
      marca,
      activo,
      variantes,
      aplicarPrecioVariantes, // 👈 Nuevo flag
      imagen_url,
      imagen_thumbnail_url,
    } = req.body;

    console.log("📝 PUT /productos/:id - Inicio");
    console.log("   ID del producto:", id);
    console.log("   Datos recibidos:", {
      nombre,
      descripcion,
      categoria_id,
      precio_base,
      marca,
      activo,
    });
    console.log("   Aplicar precio a variantes:", aplicarPrecioVariantes);
    console.log("   Variantes recibidas:", variantes?.length || 0, "variantes");
    if (variantes && variantes.length > 0) {
      console.log(
        "   SKUs de variantes:",
        variantes.map((v) => v.sku)
      );
    }

    // Actualizar datos del producto
    console.log("🔄 Ejecutando UPDATE en productos...");
    const updatePayload = {
      nombre,
      descripcion,
      categoria_id,
      precio_base,
      marca,
      activo,
      imagen_url: imagen_url || null,
      imagen_thumbnail_url: imagen_thumbnail_url || null,
      updated_at: new Date(),
    };
    console.log("   Payload de actualización:", updatePayload);

    const {
      data: updatedData,
      error: updateError,
      count,
    } = await supabase
      .from("productos")
      .update(updatePayload)
      .eq("id", id)
      .select();

    console.log("   Respuesta de UPDATE:");
    console.log("   - Data:", updatedData);
    console.log("   - Error:", updateError);
    console.log("   - Count:", count);

    if (updateError) {
      console.error("❌ Error al actualizar producto:", updateError.message);
      throw updateError;
    }

    if (!updatedData || updatedData.length === 0) {
      console.error(
        "❌ No se actualizó ningún registro. Posible problema de permisos RLS."
      );
      return res.status(404).json({
        error: "Producto no encontrado o sin permisos para actualizar",
      });
    }

    console.log("✅ Producto actualizado correctamente");

    // Si el usuario marcó aplicar precio a todas las variantes
    if (aplicarPrecioVariantes && precio_base) {
      console.log("💰 Actualizando precio de todas las variantes...");

      const { data: variantesActualizadas, error: errorPrecioVariantes } =
        await supabase
          .from("variantes_producto")
          .update({ precio: precio_base })
          .eq("producto_id", id)
          .select("id");

      if (errorPrecioVariantes) {
        console.error(
          "❌ Error al actualizar precios de variantes:",
          errorPrecioVariantes.message
        );
        // No lanzamos error, solo advertimos
      } else {
        console.log(
          `✅ ${
            variantesActualizadas?.length || 0
          } variantes actualizadas con nuevo precio: $${precio_base}`
        );
      }
    }

    // Si se enviaron variantes nuevas, crearlas
    if (variantes && variantes.length > 0) {
      console.log("🔍 Verificando variantes existentes...");

      // Obtener SKUs existentes para este producto
      const { data: variantesExistentes } = await supabase
        .from("variantes_producto")
        .select("sku")
        .eq("producto_id", id);

      console.log("   Variantes existentes:", variantesExistentes?.length || 0);
      console.log(
        "   SKUs existentes:",
        variantesExistentes?.map((v) => v.sku) || []
      );

      const skusExistentes = new Set(
        variantesExistentes?.map((v) => v.sku) || []
      );

      // Filtrar solo las variantes que no existen
      const variantesNuevas = variantes.filter(
        (v) => !skusExistentes.has(v.sku)
      );

      console.log("   Variantes nuevas a insertar:", variantesNuevas.length);
      console.log(
        "   SKUs nuevos:",
        variantesNuevas.map((v) => v.sku)
      );

      if (variantesNuevas.length > 0) {
        const variantesParaInsertar = variantesNuevas.map((variante) => ({
          producto_id: id,
          sku: variante.sku,
          atributos: variante.atributos || {},
          precio: variante.precio || precio_base,
          costo: variante.costo,
          activo: variante.activo !== false,
          imagen_url: variante.imagen_url || null,
          imagen_thumbnail_url: variante.imagen_thumbnail_url || null,
        }));

        const { error: errorVariantes } = await supabase
          .from("variantes_producto")
          .insert(variantesParaInsertar);

        if (errorVariantes) {
          console.error("❌ Error al crear variantes:", errorVariantes.message);
          throw errorVariantes;
        }

        console.log("✅ Variantes insertadas correctamente");
      } else {
        console.log(
          "ℹ️  No hay variantes nuevas para insertar (todas ya existen)"
        );
      }
    } else {
      console.log("ℹ️  No se enviaron variantes en la petición");
    }

    console.log("🔍 Obteniendo producto completo actualizado...");

    // Obtener producto completo actualizado con todas las variantes
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
          costo,
          activo,
          imagen_url,
          imagen_thumbnail_url,
          inventario_global (cantidad_disponible)
        )
      `
      )
      .eq("id", id);

    if (errorFinal) {
      console.error(
        "❌ Error al obtener producto completo:",
        errorFinal.message
      );
      throw errorFinal;
    }

    console.log("📦 Producto completo obtenido");
    console.log(
      "   Tipo de data:",
      Array.isArray(productoCompleto) ? "Array" : typeof productoCompleto
    );
    console.log(
      "   Cantidad de elementos:",
      Array.isArray(productoCompleto) ? productoCompleto.length : "N/A"
    );

    if (Array.isArray(productoCompleto) && productoCompleto.length > 0) {
      console.log(
        "   Variantes en respuesta:",
        productoCompleto[0]?.variantes_producto?.length || 0
      );
    }

    // Retornar el primer (y único) producto
    const resultado = productoCompleto?.[0] || productoCompleto;
    console.log("✅ Enviando respuesta al cliente");

    res.json(resultado);
  } catch (error) {
    console.error("❌ Error en PUT /productos/:id:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /productos/:id - Eliminar producto (soft delete)
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
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

    if (error) {
      console.error("Error al desactivar producto:", error.message);
      throw error;
    }
    if (!producto)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json({
      message: "Producto desactivado correctamente",
      id: producto.id,
    });
  } catch (error) {
    console.error("Error en DELETE /productos/:id:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
