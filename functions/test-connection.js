// functions/test-connection.js
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Cargar variables de entorno
dotenv.config({ path: ".env" });

console.log("🧪 Iniciando prueba de conexión...\n");

// Verificar variables
console.log("📋 Variables de entorno:");
console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL ? "✅ PRESENTE" : "❌ FALTANTE"
);
console.log(
  "SUPABASE_SERVICE_KEY:",
  process.env.SUPABASE_SERVICE_KEY ? "✅ PRESENTE" : "❌ FALTANTE"
);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("❌ Variables faltantes - verifica el archivo .env");
  process.exit(1);
}

// Crear cliente
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log("\n🔗 Probando conexión a Supabase...");

// Probar conexión
async function testConnection() {
  try {
    // Prueba 1: Consulta simple
    console.log("1. Probando consulta a categorías...");
    const { data: categorias, error: error1 } = await supabase
      .from("categorias")
      .select("*")
      .limit(1);

    if (error1) {
      console.error("❌ Error en consulta:", error1.message);
      return false;
    }

    console.log(
      `✅ Consulta exitosa. Encontradas: ${categorias?.length || 0} categorías`
    );

    // Prueba 2: Verificar tablas existentes
    console.log("2. Probando consulta a productos...");
    const { data: productos, error: error2 } = await supabase
      .from("productos")
      .select("id")
      .limit(1);

    if (error2) {
      console.error("❌ Error en consulta productos:", error2.message);
    } else {
      console.log(`✅ Consulta productos exitosa`);
    }

    // Prueba 3: Verificar que podemos insertar (opcional)
    console.log("3. Probando inserción de prueba...");
    const testData = {
      nombre: "Categoría de Prueba " + Date.now(),
    };

    const { data: nuevaCategoria, error: error3 } = await supabase
      .from("categorias")
      .insert([testData])
      .select();

    if (error3) {
      console.log(
        "⚠️  No se pudo insertar (puede ser normal por RLS):",
        error3.message
      );
    } else {
      console.log("✅ Inserción exitosa. ID:", nuevaCategoria[0].id);

      // Limpiar: eliminar el registro de prueba
      await supabase.from("categorias").delete().eq("id", nuevaCategoria[0].id);
      console.log("✅ Registro de prueba eliminado");
    }

    console.log(
      "\n🎉 ¡TODAS LAS PRUEBAS PASARON! La conexión funciona correctamente."
    );
    return true;
  } catch (error) {
    console.error("💥 Error inesperado:", error);
    return false;
  }
}

// Ejecutar prueba
testConnection().then((success) => {
  process.exit(success ? 0 : 1);
});
