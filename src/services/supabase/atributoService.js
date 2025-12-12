// src/services/supabase/atributoService.js

import { FUNCTIONS_URL } from "../../utils/constants";

const API_URL = FUNCTIONS_URL + "/atributos";

export class AtributoService {
  /**
   * Obtiene el token de autenticación del localStorage
   */
  static _getAuthHeaders() {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Obtener todos los atributos agrupados por tipo
   */
  static async obtenerAtributos() {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener atributos");
    }

    return await response.json();
  }

  /**
   * Obtener atributos por tipo (talla, color, etc.)
   */
  static async obtenerAtributosPorTipo(tipo) {
    const response = await fetch(`${API_URL}/tipo/${tipo}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener atributos");
    }

    return await response.json();
  }

  /**
   * Crear un nuevo atributo
   */
  static async crearAtributo(atributoData) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(atributoData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 403) {
        throw new Error("No tienes permisos para crear atributos");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Datos de atributo inválidos");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al crear atributo");
    }

    return await response.json();
  }

  /**
   * Actualizar un atributo
   */
  static async actualizarAtributo(id, atributoData) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(atributoData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 403) {
        throw new Error("No tienes permisos para actualizar atributos");
      }
      if (response.status === 404) {
        throw new Error("Atributo no encontrado");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al actualizar atributo");
    }

    return await response.json();
  }

  /**
   * Eliminar un atributo
   */
  static async eliminarAtributo(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 403) {
        throw new Error("No tienes permisos para eliminar atributos");
      }
      if (response.status === 404) {
        throw new Error("Atributo no encontrado");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "No se puede eliminar el atributo");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al eliminar atributo");
    }

    return await response.json();
  }
}
