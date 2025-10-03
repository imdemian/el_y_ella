// scripts/seedData.js
import { supabase } from "../../config/supabase.js";

const seedData = async () => {
  console.log("🌱 Insertando datos de prueba...");

  // 1. Insertar categorías
  const { data: categorias, error: errorCat } = await supabase
    .from("categorias")
    .insert([
      { nombre: "Vestidos XV Años" },
      { nombre: "Vestidos de Gala" },
      { nombre: "Accesorios" },
      { nombre: "Calzado" },
      { nombre: "Joyeria" },
    ])
    .select();

  if (errorCat) {
    console.error("❌ Error insertando categorías:", errorCat);
    return;
  }

  console.log("✅ Categorías insertadas:", categorias.length);

  // 2. Insertar productos principales
  const productosData = [
    {
      nombre: 'Vestido XV Años "Princess"',
      descripcion: "Vestido elegante para quinceañera con detalles en cristal",
      categoria_id: categorias[0].id, // Vestidos XV Años
      precio_base: 2500.0,
      marca: "Elegance",
    },
    {
      nombre: 'Vestido XV Años "Dream"',
      descripcion: "Vestido dream con volantes y aplicaciones en pedrería",
      categoria_id: categorias[0].id,
      precio_base: 3200.0,
      marca: "Dream Collection",
    },
    {
      nombre: 'Vestido de Gala "Bella"',
      descripcion: "Vestido para eventos formales y galas",
      categoria_id: categorias[1].id, // Vestidos de Gala
      precio_base: 1800.0,
      marca: "Gala Styles",
    },
    {
      nombre: "Tiara de Cristal",
      descripcion: "Hermosa tiara con cristales Swarovski",
      categoria_id: categorias[2].id, // Accesorios
      precio_base: 450.0,
      marca: "Crystal Queen",
    },
    {
      nombre: "Zapatos de Taco Alto",
      descripcion: "Zapatos elegantes para complementar el vestido",
      categoria_id: categorias[3].id, // Calzado
      precio_base: 800.0,
      marca: "WalkEasy",
    },
  ];

  const { data: productos, error: errorProd } = await supabase
    .from("productos")
    .insert(productosData)
    .select();

  if (errorProd) {
    console.error("❌ Error insertando productos:", errorProd);
    return;
  }

  console.log("✅ Productos insertados:", productos.length);

  // 3. Insertar variantes para cada producto
  const variantesData = [
    // Vestido Princess - Variantes por color y talla
    {
      producto_id: productos[0].id,
      sku: "VEST-PRINCESS-ROSA-M",
      atributos: { color: "Rosa", talla: "M", material: "Seda" },
      precio: 2500.0,
      costo: 1200.0,
    },
    {
      producto_id: productos[0].id,
      sku: "VEST-PRINCESS-ROSA-L",
      atributos: { color: "Rosa", talla: "L", material: "Seda" },
      precio: 2500.0,
      costo: 1200.0,
    },
    {
      producto_id: productos[0].id,
      sku: "VEST-PRINCESS-AZUL-M",
      atributos: { color: "Azul", talla: "M", material: "Seda" },
      precio: 2500.0,
      costo: 1200.0,
    },

    // Vestido Dream - Variantes
    {
      producto_id: productos[1].id,
      sku: "VEST-DREAM-BLANCO-M",
      atributos: { color: "Blanco", talla: "M", material: "Tul" },
      precio: 3200.0,
      costo: 1500.0,
    },
    {
      producto_id: productos[1].id,
      sku: "VEST-DREAM-BLANCO-L",
      atributos: { color: "Blanco", talla: "L", material: "Tul" },
      precio: 3200.0,
      costo: 1500.0,
    },

    // Vestido de Gala - Solo color
    {
      producto_id: productos[2].id,
      sku: "GALA-BELLA-NEGRO",
      atributos: { color: "Negro", material: "Satín" },
      precio: 1800.0,
      costo: 850.0,
    },

    // Tiara - Sin variantes (producto simple)
    {
      producto_id: productos[3].id,
      sku: "TIARA-CRISTAL-001",
      atributos: { material: "Cristal", tipo: "Tiara" },
      precio: 450.0,
      costo: 200.0,
    },

    // Zapatos - Variantes por talla
    {
      producto_id: productos[4].id,
      sku: "ZAP-TACO-NEGRO-36",
      atributos: { color: "Negro", talla: "36", tipo: "Tacón" },
      precio: 800.0,
      costo: 350.0,
    },
    {
      producto_id: productos[4].id,
      sku: "ZAP-TACO-NEGRO-38",
      atributos: { color: "Negro", talla: "38", tipo: "Tacón" },
      precio: 800.0,
      costo: 350.0,
    },
  ];

  const { data: variantes, error: errorVar } = await supabase
    .from("variantes_producto")
    .insert(variantesData)
    .select();

  if (errorVar) {
    console.error("❌ Error insertando variantes:", errorVar);
    return;
  }

  console.log("✅ Variantes insertadas:", variantes.length);

  // 4. Actualizar inventario para algunas variantes
  const inventarioData = [
    { variante_id: variantes[0].id, cantidad_disponible: 5, minimo_stock: 2 }, // Rosa M
    { variante_id: variantes[1].id, cantidad_disponible: 3, minimo_stock: 2 }, // Rosa L
    { variante_id: variantes[2].id, cantidad_disponible: 0, minimo_stock: 2 }, // Azul M (sin stock)
    { variante_id: variantes[3].id, cantidad_disponible: 2, minimo_stock: 1 }, // Dream Blanco M
    { variante_id: variantes[5].id, cantidad_disponible: 10, minimo_stock: 3 }, // Tiara
    { variante_id: variantes[6].id, cantidad_disponible: 4, minimo_stock: 2 }, // Zapatos 36
    { variante_id: variantes[7].id, cantidad_disponible: 6, minimo_stock: 2 }, // Zapatos 38
  ];

  for (const inventario of inventarioData) {
    const { error: errorInv } = await supabase
      .from("inventario_global")
      .update({
        cantidad_disponible: inventario.cantidad_disponible,
        minimo_stock: inventario.minimo_stock,
      })
      .eq("variante_id", inventario.variante_id);

    if (errorInv) {
      console.error(
        `❌ Error actualizando inventario para ${inventario.variante_id}:`,
        errorInv
      );
    }
  }

  console.log("🎉 Datos de prueba insertados correctamente!");
  console.log("📊 Resumen:");
  console.log("   - Categorías:", categorias.length);
  console.log("   - Productos:", productos.length);
  console.log("   - Variantes:", variantes.length);
};

// Ejecutar el script
seedData().catch(console.error);
