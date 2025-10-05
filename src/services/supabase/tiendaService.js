import { FUNCTIONS_URL } from "../../utils/constants";

// La URL base ya incluye '/supabase' si es necesario
const API_BASE = FUNCTIONS_URL;

/**
 * Clase que encapsula los servicios para la gestión de tiendas.
 */
export class TiendaService {
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
   * Obtiene la lista de tiendas del sistema.
   * @param {Object} options - Opciones de filtrado.
   * @param {boolean} [options.activa] - Filtrar por estado activo/inactivo.
   * @returns {Promise<Array>} - Un array con los objetos de tienda.
   */
  static async obtenerTiendas(options = {}) {
    try {
      let url = `${API_BASE}/tiendas`;

      // Agregar parámetros de query si existen
      const params = new URLSearchParams();
      if (options.activa !== undefined) {
        params.append("activa", options.activa);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
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
        throw new Error("No tienes permisos para acceder a esta sección.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Error al obtener la lista de tiendas");
      }

      return data.data || data;
    } catch (error) {
      console.error("Error en obtenerTiendas:", error);
      throw error;
    }
  }

  /**
   * Obtiene los datos de una tienda específica por su ID.
   * @param {string} id - El ID de la tienda a obtener.
   * @returns {Promise<Object>} - El objeto de la tienda.
   */
  static async obtenerTienda(id) {
    try {
      const response = await fetch(`${API_BASE}/tiendas/${id}`, {
        headers: this._getAuthHeaders(),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();

      if (response.status === 404) {
        throw new Error("Tienda no encontrada");
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Error al obtener los datos de la tienda"
        );
      }

      return data.data || data;
    } catch (error) {
      console.error("Error en obtenerTienda:", error);
      throw error;
    }
  }

  /**
   * Crea una nueva tienda en el sistema.
   * Requiere rol de 'admin'.
   * @param {Object} tiendaData - Los datos de la nueva tienda.
   * @param {string} tiendaData.nombre - Nombre de la tienda (requerido).
   * @param {string} [tiendaData.direccion] - Dirección de la tienda.
   * @param {string} [tiendaData.telefono] - Teléfono de la tienda.
   * @returns {Promise<Object>} - El objeto de la tienda creada.
   */
  static async crearTienda(tiendaData) {
    try {
      const response = await fetch(`${API_BASE}/tiendas`, {
        method: "POST",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(tiendaData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();

      if (response.status === 400) {
        throw new Error(data.message || "Datos inválidos para crear la tienda");
      }

      if (response.status === 401) {
        throw new Error(
          "No estás autenticado. Por favor, inicia sesión nuevamente."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "No tienes permisos de administrador para crear tiendas."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Error al crear la tienda");
      }

      return data.data || data;
    } catch (error) {
      console.error("Error en crearTienda:", error);
      throw error;
    }
  }

  /**
   * Actualiza los datos de una tienda.
   * Requiere rol de 'admin' o 'manager'.
   * @param {string} id - El ID de la tienda a actualizar.
   * @param {Object} tiendaData - Los nuevos datos para la tienda.
   * @param {string} [tiendaData.nombre] - Nombre de la tienda.
   * @param {string} [tiendaData.direccion] - Dirección de la tienda.
   * @param {string} [tiendaData.telefono] - Teléfono de la tienda.
   * @param {boolean} [tiendaData.activa] - Estado activo/inactivo de la tienda.
   * @returns {Promise<Object>} - El objeto de la tienda actualizada.
   */
  static async actualizarTienda(id, tiendaData) {
    try {
      const response = await fetch(`${API_BASE}/tiendas/${id}`, {
        method: "PUT",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(tiendaData),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();

      if (response.status === 404) {
        throw new Error("Tienda no encontrada");
      }

      if (response.status === 400) {
        throw new Error(
          data.message || "Datos inválidos para actualizar la tienda"
        );
      }

      if (response.status === 401) {
        throw new Error(
          "No estás autenticado. Por favor, inicia sesión nuevamente."
        );
      }

      if (response.status === 403) {
        throw new Error("No tienes permisos para actualizar tiendas.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar la tienda");
      }

      return data.data || data;
    } catch (error) {
      console.error("Error en actualizarTienda:", error);
      throw error;
    }
  }

  /**
   * Desactiva una tienda (soft delete).
   * Requiere rol de 'admin'.
   * @param {string} id - El ID de la tienda a desactivar.
   * @returns {Promise<Object>} - Respuesta de éxito.
   */
  static async desactivarTienda(id) {
    try {
      const response = await fetch(`${API_BASE}/tiendas/${id}/desactivar`, {
        method: "PATCH",
        headers: this._getAuthHeaders(),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();

      if (response.status === 404) {
        throw new Error("Tienda no encontrada");
      }

      if (response.status === 401) {
        throw new Error(
          "No estás autenticado. Por favor, inicia sesión nuevamente."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "No tienes permisos de administrador para desactivar tiendas."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Error al desactivar la tienda");
      }

      return data.data || data;
    } catch (error) {
      console.error("Error en desactivarTienda:", error);
      throw error;
    }
  }

  /**
   * Reactiva una tienda previamente desactivada.
   * Requiere rol de 'admin'.
   * @param {string} id - El ID de la tienda a reactivar.
   * @returns {Promise<Object>} - Respuesta de éxito.
   */
  static async reactivarTienda(id) {
    try {
      const response = await fetch(`${API_BASE}/tiendas/${id}/reactivar`, {
        method: "PATCH",
        headers: this._getAuthHeaders(),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `La respuesta no es JSON. Verifica que el servidor esté corriendo en ${API_BASE}`
        );
      }

      const data = await response.json();

      if (response.status === 404) {
        throw new Error("Tienda no encontrada");
      }

      if (response.status === 401) {
        throw new Error(
          "No estás autenticado. Por favor, inicia sesión nuevamente."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "No tienes permisos de administrador para reactivar tiendas."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Error al reactivar la tienda");
      }

      return data.data || data;
    } catch (error) {
      console.error("Error en reactivarTienda:", error);
      throw error;
    }
  }

  /**
   * Obtiene solo las tiendas activas.
   * @returns {Promise<Array>} - Un array con las tiendas activas.
   */
  static async obtenerTiendasActivas() {
    try {
      return await this.obtenerTiendas({ activa: true });
    } catch (error) {
      console.error("Error en obtenerTiendasActivas:", error);
      throw error;
    }
  }
}
