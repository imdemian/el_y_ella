// src/services/supabase/codigoAccesoService.js

import { FUNCTIONS_URL } from "../../utils/constants";

const API_BASE = FUNCTIONS_URL;

// Helper para headers con autenticación
const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const CodigoAccesoService = {
  // =====================================================
  // CRUD BÁSICO
  // =====================================================

  /**
   * Obtener todos los códigos de acceso
   */
  async obtenerCodigos() {
    try {
      const response = await fetch(`${API_BASE}/codigos-acceso`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar códigos de acceso");
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error al obtener códigos de acceso:", error);
      throw new Error(error.message || "Error al cargar códigos de acceso");
    }
  },

  /**
   * Obtener código por ID
   */
  async obtenerCodigoPorId(id) {
    try {
      const response = await fetch(`${API_BASE}/codigos-acceso/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar código de acceso");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al obtener código de acceso:", error);
      throw new Error(error.message || "Error al cargar código de acceso");
    }
  },

  /**
   * Crear nuevo código de acceso
   */
  async crearCodigo(codigoData) {
    try {
      const response = await fetch(`${API_BASE}/codigos-acceso`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(codigoData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear código de acceso");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al crear código de acceso:", error);
      throw new Error(error.message || "Error al crear código de acceso");
    }
  },

  /**
   * Actualizar código de acceso
   */
  async actualizarCodigo(id, codigoData) {
    try {
      const response = await fetch(`${API_BASE}/codigos-acceso/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(codigoData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Error al actualizar código de acceso"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al actualizar código de acceso:", error);
      throw new Error(error.message || "Error al actualizar código de acceso");
    }
  },

  /**
   * Eliminar código de acceso
   */
  async eliminarCodigo(id) {
    try {
      const response = await fetch(`${API_BASE}/codigos-acceso/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al eliminar código de acceso");
      }

      return { success: true };
    } catch (error) {
      console.error("Error al eliminar código de acceso:", error);
      throw new Error(error.message || "Error al eliminar código de acceso");
    }
  },

  // =====================================================
  // VALIDACIÓN Y USO
  // =====================================================

  /**
   * Validar código de acceso
   */
  async validarCodigoAcceso(codigo, usuarioId = null) {
    try {
      const response = await fetch(`${API_BASE}/codigos-acceso/validar`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          codigo,
          usuarioId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          valido: false,
          mensaje: error.message || "Código de acceso no válido",
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al validar código de acceso:", error);
      return {
        valido: false,
        mensaje: error.message || "Error al validar el código de acceso",
      };
    }
  },

  /**
   * Registrar uso de código de acceso
   */
  async registrarUsoAcceso(
    codigoAccesoId,
    usuarioId = null,
    accesoExitoso = true,
    motivoFallo = null
  ) {
    try {
      // Obtener información del navegador
      const ipAddress = null; // El backend puede obtener la IP del request
      const userAgent = navigator.userAgent;

      const response = await fetch(`${API_BASE}/codigos-acceso/registrar-uso`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          codigoAccesoId,
          usuarioId,
          ipAddress,
          userAgent,
          accesoExitoso,
          motivoFallo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al registrar uso de acceso");
      }

      return { success: true };
    } catch (error) {
      console.error("Error al registrar uso de acceso:", error);
      throw new Error(error.message || "Error al registrar uso de acceso");
    }
  },

  /**
   * Obtener historial de accesos de un código
   */
  async obtenerHistorialAccesos(codigoId, limite = 50) {
    try {
      const response = await fetch(
        `${API_BASE}/codigos-acceso/${codigoId}/historial?limite=${limite}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Error al cargar historial de accesos"
        );
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error al obtener historial de accesos:", error);
      throw new Error(error.message || "Error al cargar historial de accesos");
    }
  },

  /**
   * Obtener estadísticas de un código
   */
  async obtenerEstadisticasCodigo(codigoId) {
    try {
      const response = await fetch(
        `${API_BASE}/codigos-acceso/${codigoId}/estadisticas`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar estadísticas");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al obtener estadísticas del código:", error);
      throw new Error(error.message || "Error al cargar estadísticas");
    }
  },

  /**
   * Obtener códigos activos
   */
  async obtenerCodigosActivos() {
    try {
      const response = await fetch(`${API_BASE}/codigos-acceso/activos`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Error al cargar códigos de acceso activos"
        );
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error al obtener códigos activos:", error);
      throw new Error(
        error.message || "Error al cargar códigos de acceso activos"
      );
    }
  },

  // =====================================================
  // UTILIDADES
  // =====================================================

  /**
   * Generar código aleatorio
   */
  async generarCodigoAleatorio(longitud = 8) {
    try {
      const response = await fetch(`${API_BASE}/codigos-acceso/generar`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ longitud }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al generar código");
      }

      const data = await response.json();
      return data.codigo;
    } catch (error) {
      console.error("Error al generar código aleatorio:", error);
      // Fallback a generación local
      return this.generarCodigoAleatorioLocal(longitud);
    }
  },

  /**
   * Generar código aleatorio localmente (fallback)
   */
  generarCodigoAleatorioLocal(longitud = 8) {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let codigo = "";
    for (let i = 0; i < longitud; i++) {
      codigo += caracteres.charAt(
        Math.floor(Math.random() * caracteres.length)
      );
    }
    return codigo;
  },
};
