import { FUNCTIONS_URL } from "../../utils/constants";

// La URL base ya incluye '/supabase' si es necesario
const API_BASE = FUNCTIONS_URL;

/**
 * Clase que encapsula los servicios para la gestión de usuarios por parte de un administrador.
 */
export class UsuariosService {
  /**
   * Genera las cabeceras de autenticación necesarias para las peticiones.
   * @private
   * @returns {HeadersInit} - Objeto de cabeceras.
   */
  static _getAuthHeaders() {
    const token = localStorage.getItem("auth_token");
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.warn("⚠️ No se encontró token de autenticación en localStorage");
    }
    return headers;
  }

  /**
   * Obtiene la lista completa de usuarios del sistema.
   * Requiere rol de 'admin'.
   * @returns {Promise<Array>} - Un array con los objetos de usuario.
   */
  static async obtenerUsuarios() {
    try {
      const response = await fetch(`${API_BASE}/usuarios`, {
        headers: this._getAuthHeaders(),
      });

      // Verificar si la respuesta es JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();

      // Manejar errores específicos de autenticación
      if (response.status === 401) {
        throw new Error(
          "No estás autenticado. Por favor, inicia sesión nuevamente."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "No tienes permisos de administrador para acceder a esta sección."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Error al obtener la lista de usuarios"
        );
      }
      return data;
    } catch (error) {
      console.error("Error en obtenerUsuarios:", error);
      // Re-lanzar el error para que se muestre en la UI
      throw error;
    }
  }

  /**
   * Obtiene los datos de un usuario específico por su ID.
   * Requiere rol de 'admin'.
   * @param {string} id - El ID del usuario a obtener.
   * @returns {Promise<Object>} - El objeto del usuario.
   */
  static async obtenerUsuario(id) {
    try {
      const response = await fetch(`${API_BASE}/usuarios/${id}`, {
        headers: this._getAuthHeaders(),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "Error al obtener los datos del usuario"
        );
      }
      return data;
    } catch (error) {
      console.error("Error en obtenerUsuario:", error);
      throw error;
    }
  }

  /**
   * Actualiza los datos de un usuario.
   * Requiere rol de 'admin'.
   * @param {string} id - El ID del usuario a actualizar.
   * @param {Object} userData - Los nuevos datos para el usuario (nombre, rol, etc.).
   * @returns {Promise<Object>} - El objeto del usuario actualizado.
   */
  static async actualizarUsuario(id, userData) {
    try {
      const response = await fetch(`${API_BASE}/usuarios/${id}`, {
        method: "PUT",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar el usuario");
      }
      return data;
    } catch (error) {
      console.error("Error en actualizarUsuario:", error);
      throw error;
    }
  }

  /**
   * Elimina un usuario del sistema (de Auth y de la base de datos).
   * Requiere rol de 'admin'.
   * @param {string} id - El ID del usuario a eliminar.
   * @returns {Promise<Object>} - Respuesta de éxito.
   */
  static async eliminarUsuario(id) {
    try {
      const response = await fetch(`${API_BASE}/usuarios/${id}`, {
        method: "DELETE",
        headers: this._getAuthHeaders(),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al eliminar el usuario");
      }
      return data;
    } catch (error) {
      console.error("Error en eliminarUsuario:", error);
      throw error;
    }
  }

  /**
   * Cambia la contraseña de un usuario.
   * Requiere rol de 'admin'.
   * @param {string} id - El ID del usuario.
   * @param {{ nuevaPassword: string }} payload - El objeto con la nueva contraseña.
   * @returns {Promise<Object>} - Respuesta de éxito.
   */
  static async changePassword(id, payload) {
    try {
      const response = await fetch(
        `${API_BASE}/usuarios/${id}/password-change`,
        {
          method: "PUT",
          headers: this._getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al cambiar la contraseña");
      }
      return data;
    } catch (error) {
      console.error("Error en changePassword:", error);
      throw error;
    }
  }
}
