// functions/routes/authRouter.js - VERSIÓN CORREGIDA
import express from "express";
// Importamos ambos clientes de Supabase
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { supabase, supabaseAdmin } from "../config/supabase.js";

const router = express.Router();

// ==================
//      LOGIN
// ==================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email y password son requeridos" });
    }

    // 1. Autenticar al usuario con el cliente normal
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return res.status(401).json({ message: authError.message });
    }
    if (!authData.user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 2. Obtener el perfil del usuario desde la tabla 'usuarios'
    // Se usa el cliente NORMAL porque esta acción la realiza el propio usuario logueado
    // y debe respetar las RLS (un usuario solo puede leer su propio perfil).
    const { data: profile, error: profileError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      // Si el perfil es obligatorio, falla el login.
      console.warn(
        "ADVERTENCIA: Usuario autenticado pero sin perfil en la BD:",
        authData.user.id
      );
      return res
        .status(404)
        .json({ message: "El perfil del usuario no fue encontrado." });
    }

    // 3. Devolver una respuesta unificada
    res.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        ...profile, // Mezcla los datos del perfil
      },
      session: authData.session,
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor", error: error.message });
  }
});

// ==================
//     REGISTER
// ==================
router.post("/register", async (req, res) => {
  try {
    const { email, password, nombre, apellido, rol, tienda_id } = req.body;
    if (!email || !password || !nombre) {
      return res
        .status(400)
        .json({ message: "Email, password y nombre son requeridos" });
    }

    // 1. Registrar el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }
    if (!authData.user) {
      return res.status(500).json({
        message: "No se pudo crear el usuario en el sistema de autenticación.",
      });
    }

    // 2. Insertar el perfil en la tabla 'usuarios' USANDO EL CLIENTE ADMIN
    // Esto es necesario para bypassear las políticas RLS en el servidor.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        id: authData.user.id,
        nombre: nombre,
        apellido: apellido,
        // No se inserta email, created_at, o updated_at. La BD se encarga.
        rol: rol,
        tienda_id: tienda_id || null,
      })
      .select()
      .single();

    if (profileError) {
      // Si esto falla, el registro está incompleto. Es un error grave.
      console.error(
        "❌ Error CRÍTICO: El usuario se creó en auth pero no en la BD.",
        profileError
      );
      return res
        .status(5.0)
        .json({ message: `Error al crear el perfil: ${profileError.message}` });
    }

    res.status(201).json({
      success: true,
      message:
        "Usuario registrado exitosamente. Revisa tu email para la confirmación.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        ...profile,
      },
    });
  } catch (error) {
    console.error("❌ Error en registro:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor", error: error.message });
  }
});

// ==================
//      LOGOUT
// ==================
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    // El middleware 'authenticateToken' ya validó el token.
    // Ahora le decimos a Supabase que lo invalide.
    const token = req.headers.authorization.split(" ")[1];

    // Usamos el cliente Admin para invalidar el token del usuario.
    const { error } = await supabaseAdmin.auth.signOut(token);

    if (error) {
      // Incluso si hay un error aquí, es probable que el token ya no sea válido.
      // Podemos registrar el error pero aun así enviar una respuesta positiva.
      console.error("Error menor en Supabase signOut:", error.message);
    }

    res.json({ success: true, message: "Sesión cerrada en el servidor" });
  } catch (error) {
    res.status(500).json({ message: "Error en logout", error: error.message });
  }
});

export default router;
