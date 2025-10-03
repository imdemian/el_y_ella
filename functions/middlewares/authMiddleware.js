// functions/middleware/authMiddleware.js
import { supabaseAdmin } from "../config/supabase.js"; // Usamos Admin por si las RLS son restrictivas

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token de acceso requerido" });
    }

    // 1. Validar el token y obtener el usuario de 'auth'
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }

    // 2. OBTENER EL PERFIL Y EL ROL DE LA TABLA 'usuarios'
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .select("*") // Obtenemos todo el perfil
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res
        .status(404)
        .json({ message: "El perfil del usuario no fue encontrado." });
    }

    // 3. Combinar la información y agregarla al request
    // Ahora req.user tiene id, email, rol, nombre, etc.
    req.user = { ...user, ...profile };

    next();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error de autenticación", error: error.message });
  }
};

// Middleware para verificar roles (AHORA MÁS SIMPLE Y RÁPIDO)
export const requireRole = (roles) => {
  // Ya no necesita ser 'async' porque no hay llamada a la BD
  return (req, res, next) => {
    // req.user ya tiene el rol gracias al middleware anterior
    if (!req.user.rol || !roles.includes(req.user.rol)) {
      return res.status(403).json({
        message: "No tienes permisos para esta acción",
      });
    }
    next();
  };
};
