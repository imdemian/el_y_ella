/* eslint-disable no-undef */
// functions/config/supabase.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Asegúrate de que tu archivo .env tenga las tres variables
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // Clave pública
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Clave de administrador (secreta)

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

// 1. Cliente PÚBLICO (respeta RLS)
// Se usa para operaciones que deberían actuar como un usuario anónimo
// o si necesitas pasar un cliente al frontend.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Cliente ADMIN (ignora RLS) - ¡ESTE ES EL QUE FALTABA!
// Se usa para operaciones de servidor que necesitan privilegios de administrador,
// como crear perfiles de usuario durante el registro.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
