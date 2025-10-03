// functions/routes/empleadoRouter.js
import express from "express";
import { supabase } from "../config/supabase.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// CREAR EMPLEADO COMPLETO (Auth + Usuario)
router.post(
  "/",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { email, password, nombre, telefono, rol, tienda_id } = req.body;

      if (!email || !password || !nombre || !rol) {
        return res.status(400).json({
          success: false,
          message: "Email, password, nombre y rol son requeridos",
        });
      }

      // Validar rol
      const rolesPermitidos = ["admin", "manager", "vendedor", "usuario"];
      if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({
          success: false,
          message: `Rol inválido. Permitidos: ${rolesPermitidos.join(", ")}`,
        });
      }

      // 1. PRIMERO: Crear usuario en Supabase Auth
      console.log("🔐 Creando usuario en Auth...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nombre: nombre,
            rol: rol,
          },
        },
      });

      if (authError) {
        console.error("Error en Auth:", authError);
        return res.status(400).json({
          success: false,
          message: "Error al crear usuario en el sistema de autenticación",
          error: authError.message,
        });
      }

      if (!authData.user) {
        return res.status(500).json({
          success: false,
          message: "No se pudo crear el usuario en Auth",
        });
      }

      console.log("✅ Usuario creado en Auth con ID:", authData.user.id);

      // 2. SEGUNDO: Crear registro en tabla usuarios
      console.log("📊 Creando registro en tabla usuarios...");
      const { data: nuevoEmpleado, error: usuarioError } = await supabase
        .from("usuarios")
        .insert([
          {
            id: authData.user.id, // ⚠️ MISMO ID que Auth
            email: email,
            nombre: nombre,
            telefono: telefono || "",
            rol: rol,
            tienda_id: tienda_id || null,
            activo: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ])
        .select(
          `
        *,
        tiendas (id, nombre)
      `
        )
        .single();

      if (usuarioError) {
        console.error("Error en tabla usuarios:", usuarioError);

        // Intentar revertir: eliminar usuario de Auth si falla la creación en BD
        await supabase.auth.admin.deleteUser(authData.user.id);

        return res.status(400).json({
          success: false,
          message: "Error al crear registro en base de datos",
          error: usuarioError.message,
        });
      }

      console.log("✅ Empleado creado exitosamente");

      // 3. Preparar respuesta
      const response = {
        success: true,
        message: authData.session
          ? "Empleado creado y logged in"
          : "Empleado creado - verificar email",
        data: {
          ...nuevoEmpleado,
          auth_user: {
            id: authData.user.id,
            needs_email_confirm: !authData.session,
          },
        },
      };

      // 4. Si hay sesión, incluir credenciales temporales (para desarrollo)
      if (authData.session) {
        response.temporary_credentials = {
          access_token: authData.session.access_token,
          expires_at: authData.session.expires_at,
        };
      }

      return res.status(201).json(response);
    } catch (error) {
      console.error("Error creando empleado:", error);
      return res.status(500).json({
        success: false,
        message: "Error al crear empleado",
        error: error.message,
      });
    }
  }
);

// LISTAR EMPLEADOS - Solo admin/manager
router.get(
  "/",
  authenticateToken,
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { tienda_id, activo, rol } = req.query;

      let query = supabase
        .from("usuarios")
        .select(
          `
        *,
        tiendas (id, nombre)
      `
        )
        .order("nombre");

      // Aplicar filtros
      if (tienda_id) {
        query = query.eq("tienda_id", tienda_id);
      }

      if (activo !== undefined) {
        query = query.eq("activo", activo === "true");
      }

      if (rol) {
        query = query.eq("rol", rol);
      }

      const { data: empleados, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: empleados,
      });
    } catch (error) {
      console.error("Error obteniendo empleados:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener empleados",
        error: error.message,
      });
    }
  }
);

// OBTENER EMPLEADO POR ID - Usuario actual o admin/manager
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar permisos: usuario puede verse a sí mismo, admin/manager pueden ver a cualquiera
    const { data: usuarioActual } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", req.user.id)
      .single();

    if (
      usuarioActual.rol !== "admin" &&
      usuarioActual.rol !== "manager" &&
      req.user.id !== id
    ) {
      return res.status(403).json({
        success: false,
        message: "Solo puedes ver tu propio perfil",
      });
    }

    const { data: empleado, error } = await supabase
      .from("usuarios")
      .select(
        `
        *,
        tiendas (id, nombre)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Empleado no encontrado",
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: empleado,
    });
  } catch (error) {
    console.error("Error obteniendo empleado:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener empleado",
      error: error.message,
    });
  }
});

// ACTUALIZAR EMPLEADO - Solo admin o el propio usuario
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, rol, tienda_id, activo } = req.body;

    // Verificar permisos
    const { data: usuarioActual } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", req.user.id)
      .single();

    const puedeModificar = usuarioActual.rol === "admin" || req.user.id === id;

    if (!puedeModificar) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para modificar este empleado",
      });
    }

    // Solo admin puede cambiar rol
    if (rol && usuarioActual.rol !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Solo un administrador puede cambiar roles",
      });
    }

    // Actualizar empleado
    const updateData = {
      nombre: nombre,
      email: email,
      telefono: telefono || "",
      updated_at: new Date(),
    };

    // Solo incluir estos campos si es admin
    if (usuarioActual.rol === "admin") {
      if (rol) updateData.rol = rol;
      if (tienda_id !== undefined) updateData.tienda_id = tienda_id;
      if (activo !== undefined) updateData.activo = activo;
    }

    const { data: empleadoActualizado, error: errorActualizar } = await supabase
      .from("usuarios")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        tiendas (id, nombre)
      `
      )
      .single();

    if (errorActualizar) throw errorActualizar;

    return res.status(200).json({
      success: true,
      data: empleadoActualizado,
    });
  } catch (error) {
    console.error("Error actualizando empleado:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar empleado",
      error: error.message,
    });
  }
});

export default router;
