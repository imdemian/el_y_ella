// functions/routes/testRouter.js (nuevo archivo)
import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// Endpoint simple para probar conexión
router.get("/conexion", async (req, res) => {
  try {
    console.log("🧪 Probando conexión a Supabase...");

    // Consulta simple a una tabla que debe existir
    const { error, count } = await supabase
      .from("categorias")
      .select("*", { count: "exact" })
      .limit(1);

    if (error) {
      console.error("❌ Error de conexión:", error);
      return res.status(500).json({
        success: false,
        error: "Error de conexión a Supabase",
        details: error.message,
      });
    }

    console.log("✅ Conexión exitosa a Supabase");
    res.json({
      success: true,
      message: "Conexión a Supabase exitosa",
      categorias_encontradas: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥 Error inesperado:", error);
    res.status(500).json({
      success: false,
      error: "Error inesperado",
      details: error.message,
    });
  }
});

// Probar inserción simple
router.post("/test-insert", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categorias")
      .insert([
        {
          nombre: "Categoría de Prueba " + Date.now(),
        },
      ])
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: "Inserción prueba exitosa",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error en inserción prueba",
      details: error.message,
    });
  }
});

export default router;
