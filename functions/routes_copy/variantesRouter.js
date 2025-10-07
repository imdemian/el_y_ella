// functions/routes_copy/variantesRouter.js
import express from "express";
import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /variantes - Lista de variantes con filtros
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      producto_id,
      activo = true,
      search = "",
    } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    // Construir query base
    let query = supabase.from("variantes_producto").select(
      `
        *,
        productos (id, nombre, precio_base),
        inventario_global (
          cantidad_disponible,
          cantidad_reservada,
          minimo_stock
        )
      `,
      { count: "exact" }
    );

    // Aplicar filtros
    if (producto_id) {
      query = query.eq("producto_id", producto_id);
    }

    if (search) {
      query = query.ilike("sku", `%${search}%`);
    }

    if (activo !== "all") {
      query = query.eq("activo", activo === "true");
    }

    // Ordenamiento y paginación
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limitInt - 1);

    // Ejecutar query
    const { data: variantes, error, count } = await query;

    if (error) {
      console.error("Error al obtener variantes:", error.message);
      throw error;
    }

    // Calcular metadata de paginación
    const totalPages = Math.ceil(count / limitInt);
    const hasNextPage = pageInt < totalPages;
    const hasPrevPage = pageInt > 1;

    res.json({
      data: variantes,
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
        producto_id: producto_id || "all",
        activo: activo === "all" ? "all" : activo === "true",
        search,
      },
    });
  } catch (error) {
    console.error("Error en GET /variantes:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /variantes/:id - Variante específica con inventario
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: variante, error } = await supabase
      .from("variantes_producto")
      .select(
        `
        *,
        productos (id, nombre, precio_base, categorias (id, nombre)),
        inventario_global (
          cantidad_disponible,
          cantidad_reservada,
          minimo_stock,
          ubicacion
        ),
        inventario_tiendas (
          id,
          tienda_id,
          cantidad_disponible,
          cantidad_reservada,
          tiendas (id, nombre)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error al obtener variante:", error.message);
      throw error;
    }

    if (!variante) {
      return res.status(404).json({ error: "Variante no encontrada" });
    }

    res.json(variante);
  } catch (error) {
    console.error("Error en GET /variantes/:id:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /variantes - Crear nueva variante
router.post("/", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { producto_id, sku, atributos, precio, costo, activo } = req.body;

    // Validaciones básicas
    if (!producto_id || !sku) {
      return res
        .status(400)
        .json({ error: "producto_id y sku son requeridos" });
    }

    // Verificar que el producto existe
    const { data: producto, error: errorProducto } = await supabase
      .from("productos")
      .select("id, precio_base")
      .eq("id", producto_id)
      .single();

    if (errorProducto || !producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Verificar que el SKU no exista
    const { data: skuExistente } = await supabase
      .from("variantes_producto")
      .select("id")
      .eq("sku", sku)
      .single();

    if (skuExistente) {
      return res.status(400).json({ error: "El SKU ya existe" });
    }

    // Crear variante
    const { data: nuevaVariante, error: errorVariante } = await supabase
      .from("variantes_producto")
      .insert([
        {
          producto_id,
          sku,
          atributos: atributos || {},
          precio: precio || producto.precio_base,
          costo: costo || null,
          activo: activo !== false,
        },
      ])
      .select(
        `
        *,
        productos (id, nombre),
        inventario_global (cantidad_disponible)
      `
      )
      .single();

    if (errorVariante) {
      console.error("Error al crear variante:", errorVariante.message);
      throw errorVariante;
    }

    res.status(201).json(nuevaVariante);
  } catch (error) {
    console.error("Error en POST /variantes:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /variantes/:id - Actualizar variante
router.put("/:id", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, atributos, precio, costo, activo } = req.body;

    // Si se actualiza el SKU, verificar que no exista
    if (sku) {
      const { data: skuExistente } = await supabase
        .from("variantes_producto")
        .select("id")
        .eq("sku", sku)
        .neq("id", id)
        .single();

      if (skuExistente) {
        return res.status(400).json({ error: "El SKU ya existe" });
      }
    }

    const { data: variante, error } = await supabase
      .from("variantes_producto")
      .update({
        sku,
        atributos,
        precio,
        costo,
        activo,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select(
        `
        *,
        productos (id, nombre),
        inventario_global (cantidad_disponible)
      `
      )
      .single();

    if (error) {
      console.error("Error al actualizar variante:", error.message);
      throw error;
    }

    if (!variante) {
      return res.status(404).json({ error: "Variante no encontrada" });
    }

    res.json(variante);
  } catch (error) {
    console.error("Error en PUT /variantes/:id:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /variantes/:id - Desactivar variante (soft delete)
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: variante, error } = await supabase
      .from("variantes_producto")
      .update({
        activo: false,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select("id, sku")
      .single();

    if (error) {
      console.error("Error al desactivar variante:", error.message);
      throw error;
    }

    if (!variante) {
      return res.status(404).json({ error: "Variante no encontrada" });
    }

    res.json({
      message: "Variante desactivada correctamente",
      id: variante.id,
      sku: variante.sku,
    });
  } catch (error) {
    console.error("Error en DELETE /variantes/:id:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /variantes/:id/inventario/ajustar - Ajustar inventario global
router.post(
  "/:id/inventario/ajustar",
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { cantidad, tipo, motivo, usuario_id } = req.body;

      // Validaciones
      if (!cantidad || !tipo || !motivo) {
        return res.status(400).json({
          error: "cantidad, tipo y motivo son requeridos",
        });
      }

      if (!["entrada", "salida", "ajuste"].includes(tipo)) {
        return res.status(400).json({
          error: 'tipo debe ser "entrada", "salida" o "ajuste"',
        });
      }

      // Verificar que la variante existe
      const { data: variante, error: errorVariante } = await supabase
        .from("variantes_producto")
        .select("id, sku")
        .eq("id", id)
        .single();

      if (errorVariante || !variante) {
        return res.status(404).json({ error: "Variante no encontrada" });
      }

      // Obtener inventario actual
      const { data: inventario } = await supabase
        .from("inventario_global")
        .select("cantidad_disponible")
        .eq("variante_id", id)
        .single();

      const cantidadActual = inventario?.cantidad_disponible || 0;
      let nuevaCantidad = cantidadActual;

      // Calcular nueva cantidad según el tipo
      if (tipo === "entrada") {
        nuevaCantidad = cantidadActual + parseInt(cantidad);
      } else if (tipo === "salida") {
        nuevaCantidad = cantidadActual - parseInt(cantidad);
        if (nuevaCantidad < 0) {
          return res
            .status(400)
            .json({ error: "Stock insuficiente para la salida" });
        }
      } else if (tipo === "ajuste") {
        nuevaCantidad = parseInt(cantidad);
      }

      // Actualizar inventario global
      const { error: errorInventario } = await supabase
        .from("inventario_global")
        .upsert(
          {
            variante_id: id,
            cantidad_disponible: nuevaCantidad,
            updated_at: new Date(),
          },
          {
            onConflict: "variante_id",
          }
        )
        .select()
        .single();

      if (errorInventario) {
        console.error(
          "Error al actualizar inventario:",
          errorInventario.message
        );
        throw errorInventario;
      }

      // Registrar movimiento
      const { error: errorMovimiento } = await supabase
        .from("movimientos_inventario")
        .insert([
          {
            variante_id: id,
            tipo,
            cantidad: parseInt(cantidad),
            cantidad_anterior: cantidadActual,
            cantidad_nueva: nuevaCantidad,
            motivo,
            usuario_id: usuario_id || req.user?.id,
          },
        ]);

      if (errorMovimiento) {
        console.error(
          "Error al registrar movimiento:",
          errorMovimiento.message
        );
      }

      res.json({
        message: "Inventario ajustado correctamente",
        variante_id: id,
        sku: variante.sku,
        cantidad_anterior: cantidadActual,
        cantidad_nueva: nuevaCantidad,
        tipo,
        motivo,
      });
    } catch (error) {
      console.error(
        "Error en POST /variantes/:id/inventario/ajustar:",
        error.message
      );
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /variantes/:id/inventario/movimientos - Historial de movimientos
router.get("/:id/inventario/movimientos", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    const {
      data: movimientos,
      error,
      count,
    } = await supabase
      .from("movimientos_inventario")
      .select(
        `
        *,
        usuarios (id, nombre, email)
      `,
        { count: "exact" }
      )
      .eq("variante_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limitInt - 1);

    if (error) {
      console.error("Error al obtener movimientos:", error.message);
      throw error;
    }

    const totalPages = Math.ceil(count / limitInt);

    res.json({
      data: movimientos,
      pagination: {
        current_page: pageInt,
        per_page: limitInt,
        total_items: count,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Error en GET /variantes/:id/inventario/movimientos:",
      error.message
    );
    res.status(500).json({ error: error.message });
  }
});

// GET /variantes/stats/inventario - Estadísticas de inventario
router.get("/stats/inventario", async (req, res) => {
  try {
    const { data: stats, error } = await supabase
      .from("variantes_producto")
      .select(
        `
        id,
        sku,
        inventario_global (cantidad_disponible, minimo_stock)
      `
      )
      .eq("activo", true);

    if (error) {
      console.error("Error al obtener estadísticas:", error.message);
      throw error;
    }

    const totalVariantes = stats.length;
    const totalStock = stats.reduce(
      (acc, v) => acc + (v.inventario_global?.cantidad_disponible || 0),
      0
    );
    const variantesConStock = stats.filter(
      (v) => (v.inventario_global?.cantidad_disponible || 0) > 0
    ).length;
    const variantesSinStock = totalVariantes - variantesConStock;
    const variantesBajoMinimo = stats.filter(
      (v) =>
        (v.inventario_global?.cantidad_disponible || 0) <
        (v.inventario_global?.minimo_stock || 0)
    ).length;

    res.json({
      total_variantes: totalVariantes,
      total_stock: totalStock,
      variantes_con_stock: variantesConStock,
      variantes_sin_stock: variantesSinStock,
      variantes_bajo_minimo: variantesBajoMinimo,
    });
  } catch (error) {
    console.error("Error en GET /variantes/stats/inventario:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
