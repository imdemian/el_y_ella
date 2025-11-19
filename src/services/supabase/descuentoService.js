import { FUNCTIONS_URL } from "../../utils/constants";

// src/services/supabase/descuentoService.js
const API_BASE = FUNCTIONS_URL;

// Helper para headers con autenticación
const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const DescuentoService = {
  // =====================================================
  // CRUD BÁSICO
  // =====================================================

  /**
   * Obtener todos los descuentos
   */
  async obtenerDescuentos() {
    try {
      const response = await fetch(`${API_BASE}/descuentos`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar descuentos");
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error al obtener descuentos:", error);
      throw new Error(error.message || "Error al cargar descuentos");
    }
  },

  /**
   * Obtener descuento por ID
   */
  async obtenerDescuentoPorId(id) {
    try {
      const response = await fetch(`${API_BASE}/descuentos/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar descuento");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al obtener descuento:", error);
      throw new Error(error.message || "Error al cargar descuento");
    }
  },

  /**
   * Crear nuevo descuento
   */
  async crearDescuento(descuentoData) {
    try {
      const response = await fetch(`${API_BASE}/descuentos`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(descuentoData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear descuento");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al crear descuento:", error);
      throw new Error(error.message || "Error al crear descuento");
    }
  },

  /**
   * Actualizar descuento
   */
  async actualizarDescuento(id, descuentoData) {
    try {
      const response = await fetch(`${API_BASE}/descuentos/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(descuentoData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al actualizar descuento");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al actualizar descuento:", error);
      throw new Error(error.message || "Error al actualizar descuento");
    }
  },

  /**
   * Eliminar descuento
   */
  async eliminarDescuento(id) {
    try {
      const response = await fetch(`${API_BASE}/descuentos/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al eliminar descuento");
      }

      return { success: true };
    } catch (error) {
      console.error("Error al eliminar descuento:", error);
      throw new Error(error.message || "Error al eliminar descuento");
    }
  },

  // =====================================================
  // VALIDACIÓN Y APLICACIÓN
  // =====================================================

  /**
   * Validar código de descuento
   */
  async validarDescuento(codigo, subtotal, items = [], clienteInfo = null) {
    try {
      const response = await fetch(`${API_BASE}/descuentos/validar`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          codigo,
          subtotal,
          items,
          clienteInfo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          valido: false,
          mensaje: error.message || "Código de descuento no válido",
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al validar descuento:", error);
      return {
        valido: false,
        mensaje: error.message || "Error al validar el código de descuento",
      };
    }
  },

  /**
   * Calcular monto del descuento (helper frontend)
   */
  calcularMontoDescuento(descuento, subtotal) {
    let montoDescuento = 0;

    if (descuento.tipo_descuento === "porcentaje") {
      montoDescuento = (subtotal * descuento.valor) / 100;

      // Aplicar monto máximo si existe
      if (descuento.monto_maximo && montoDescuento > descuento.monto_maximo) {
        montoDescuento = descuento.monto_maximo;
      }
    } else if (descuento.tipo_descuento === "fijo") {
      montoDescuento = descuento.valor;

      // No puede ser mayor al subtotal
      if (montoDescuento > subtotal) {
        montoDescuento = subtotal;
      }
    }

    return parseFloat(montoDescuento.toFixed(2));
  },

  /**
   * Verificar si el descuento aplica a items (helper frontend)
   */
  verificarAplicacionItems(descuento, items) {
    if (descuento.aplica_a === "todo") return true;
    if (!items || items.length === 0) return false;

    // Verificar si algún item cumple con las condiciones
    for (const item of items) {
      if (descuento.aplica_a === "categoria") {
        if (
          descuento.referencia_ids &&
          descuento.referencia_ids.includes(item.producto?.categoria_id)
        ) {
          return true;
        }
      } else if (descuento.aplica_a === "producto") {
        if (
          descuento.referencia_ids &&
          descuento.referencia_ids.includes(item.producto_id)
        ) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Registrar uso de descuento
   */
  async registrarUsoDescuento(
    descuentoId,
    ventaId,
    clienteInfo = null,
    montoDescuento
  ) {
    try {
      const response = await fetch(`${API_BASE}/descuentos/registrar-uso`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          descuentoId,
          ventaId,
          clienteInfo,
          montoDescuento,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al registrar uso de descuento");
      }

      return { success: true };
    } catch (error) {
      console.error("Error al registrar uso de descuento:", error);
      throw new Error(error.message || "Error al registrar uso de descuento");
    }
  },

  /**
   * Obtener estadísticas de un descuento
   */
  async obtenerEstadisticasDescuento(descuentoId) {
    try {
      const response = await fetch(
        `${API_BASE}/descuentos/${descuentoId}/estadisticas`,
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
      console.error("Error al obtener estadísticas:", error);
      throw new Error(error.message || "Error al cargar estadísticas");
    }
  },

  /**
   * Obtener descuentos activos
   */
  async obtenerDescuentosActivos() {
    try {
      const response = await fetch(`${API_BASE}/descuentos/activos`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar descuentos activos");
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error al obtener descuentos activos:", error);
      throw new Error(error.message || "Error al cargar descuentos activos");
    }
  },
};
