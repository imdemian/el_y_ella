// frontend/src/services/supabase/categoriaService.js
import { FUNCTIONS_URL } from "../../utils/constants";

const API_BASE = FUNCTIONS_URL;

export class CategoriaService {
  /**
   * Obtiene los headers de autenticación
   * @private
   */
  static _getAuthHeaders() {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Obtener todas las categorías
   */
  static async obtenerCategorias() {
    try {
      const response = await fetch(`${API_BASE}/categorias`, {
        headers: this._getAuthHeaders(),
      });

      if (response.status === 401) {
        throw new Error("No autorizado. Por favor, inicia sesión nuevamente.");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error obteniendo categorías");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en obtenerCategorias:", error);
      throw error;
    }
  }

  /**
   * Obtener una categoría por ID
   * @param {string} id - ID de la categoría
   */
  static async obtenerCategoria(id) {
    try {
      const response = await fetch(`${API_BASE}/categorias/${id}`, {
        headers: this._getAuthHeaders(),
      });

      if (response.status === 404) {
        throw new Error("Categoría no encontrada");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error obteniendo categoría");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en obtenerCategoria:", error);
      throw error;
    }
  }

  /**
   * Crear una nueva categoría
   * @param {Object} categoriaData - Datos de la categoría
   */
  static async crearCategoria(categoriaData) {
    try {
      const response = await fetch(`${API_BASE}/categorias`, {
        method: "POST",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(categoriaData),
      });

      if (response.status === 401) {
        throw new Error("No autorizado. Por favor, inicia sesión nuevamente.");
      }

      if (response.status === 403) {
        throw new Error("No tienes permisos para crear categorías.");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || error.message || "Error creando categoría"
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error en crearCategoria:", error);
      throw error;
    }
  }

  /**
   * Actualizar una categoría existente
   * @param {string} id - ID de la categoría
   * @param {Object} categoriaData - Datos a actualizar
   */
  static async actualizarCategoria(id, categoriaData) {
    try {
      const response = await fetch(`${API_BASE}/categorias/${id}`, {
        method: "PUT",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(categoriaData),
      });

      if (response.status === 401) {
        throw new Error("No autorizado. Por favor, inicia sesión nuevamente.");
      }

      if (response.status === 403) {
        throw new Error("No tienes permisos para actualizar categorías.");
      }

      if (response.status === 404) {
        throw new Error("Categoría no encontrada");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || error.message || "Error actualizando categoría"
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error en actualizarCategoria:", error);
      throw error;
    }
  }

  /**
   * Eliminar una categoría
   * @param {string} id - ID de la categoría
   */
  static async eliminarCategoria(id) {
    try {
      const response = await fetch(`${API_BASE}/categorias/${id}`, {
        method: "DELETE",
        headers: this._getAuthHeaders(),
      });

      if (response.status === 401) {
        throw new Error("No autorizado. Por favor, inicia sesión nuevamente.");
      }

      if (response.status === 403) {
        throw new Error("No tienes permisos para eliminar categorías.");
      }

      if (response.status === 404) {
        throw new Error("Categoría no encontrada");
      }

      if (response.status === 400) {
        const error = await response.json();
        throw new Error(
          error.message ||
            "No se puede eliminar la categoría porque tiene productos asociados"
        );
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || error.message || "Error eliminando categoría"
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error en eliminarCategoria:", error);
      throw error;
    }
  }
}
