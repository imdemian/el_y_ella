/* eslint-disable no-undef */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config({ path: ".env" });

// 🛡️ CORRECCIÓN CRÍTICA PARA EL DESPLIEGUE:
// Usamos valores "placeholder" que parezcan URLs válidas.
// Si usamos una cadena vacía "", la librería createClient lanza un error fatal
// y tu Cloud Function se muere antes de poder desplegarse.
const supabaseUrl =
  process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "placeholder-key";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || "placeholder-key";

// Advertencia en logs si faltan las variables (pero sin detener la app)
if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_ANON_KEY ||
  !process.env.SUPABASE_SERVICE_KEY
) {
  console.warn(
    "⚠️ ADVERTENCIA: Faltan variables de entorno de Supabase. Usando valores placeholder para evitar crash durante el despliegue."
  );
}

// 1. Cliente PÚBLICO
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Cliente ADMIN
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
