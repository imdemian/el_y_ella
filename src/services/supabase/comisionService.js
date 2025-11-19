// src/services/supabase/comisionService.js

import { FUNCTIONS_URL } from "../../utils/constants";

const API_BASE = FUNCTIONS_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const ComisionService = {
  // =====================================================
  // CRUD BÁSICO
  // =====================================================

  /**
   * Obtener todas las comisiones
   */
  async obtenerComisiones() {
    try {
      const response = await fetch(`${API_BASE}/comisiones`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar comisiones");
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error al obtener comisiones:", error);
      throw new Error(error.message || "Error al cargar comisiones");
    }
  },

  /**
   * Obtener comisión por ID
   */
  async obtenerComisionPorId(id) {
    try {
      const response = await fetch(`${API_BASE}/comisiones/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar comisión");
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener comisión:", error);
      throw new Error(error.message || "Error al cargar comisión");
    }
  },

  /**
   * Crear nueva comisión
   */
  async crearComision(comisionData) {
    try {
      const response = await fetch(`${API_BASE}/comisiones`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(comisionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear comisión");
      }

      return await response.json();
    } catch (error) {
      console.error("Error al crear comisión:", error);
      throw new Error(error.message || "Error al crear comisión");
    }
  },

  /**
   * Actualizar comisión
   */
  async actualizarComision(id, comisionData) {
    try {
      const response = await fetch(`${API_BASE}/comisiones/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(comisionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al actualizar comisión");
      }

      return await response.json();
    } catch (error) {
      console.error("Error al actualizar comisión:", error);
      throw new Error(error.message || "Error al actualizar comisión");
    }
  },

  /**
   * Eliminar comisión
   */
  async eliminarComision(id) {
    try {
      const response = await fetch(`${API_BASE}/comisiones/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al eliminar comisión");
      }

      return true;
    } catch (error) {
      console.error("Error al eliminar comisión:", error);
      throw new Error(error.message || "Error al eliminar comisión");
    }
  },

  // =====================================================
  // FUNCIONES DE CÁLCULO
  // =====================================================

  /**
   * Obtener comisiones activas
   */
  async obtenerComisionesActivas() {
    try {
      const response = await fetch(`${API_BASE}/comisiones/activas`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar comisiones activas");
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error al obtener comisiones activas:", error);
      throw new Error(error.message || "Error al cargar comisiones activas");
    }
  },

  /**
   * Calcular comisión para una venta
   * @param {Object} venta - Objeto de venta con total, items, empleado, etc.
   * @returns {Object} - { comisionTotal, desglose: [...] }
   */
  async calcularComisionVenta(venta) {
    try {
      const response = await fetch(`${API_BASE}/comisiones/calcular`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ venta }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al calcular comisión");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error al calcular comisión:", error);
      return { comisionTotal: 0, desglose: [] };
    }
  },

  /**
   * Verificar si una comisión aplica a una venta específica (helper frontend)
   * NOTA: Esta función ahora se ejecuta en el backend a través de calcularComisionVenta
   * Se mantiene aquí solo para referencia o uso local si es necesario
   */
  verificarAplicacionComision(comision, venta) {
    // Comisión para todos
    if (comision.aplica_a === "todos") {
      return true;
    }

    // Comisión por empleado
    if (comision.aplica_a === "empleado") {
      return venta.usuario_id === comision.referencia_id;
    }

    // Comisión por categoría (verificar items de la venta)
    if (comision.aplica_a === "categoria") {
      if (!venta.ventas_items || venta.ventas_items.length === 0) return false;

      // Obtener categorías de los productos en la venta
      for (const item of venta.ventas_items) {
        if (item.producto?.categoria_id === comision.referencia_id) {
          return true;
        }
      }
      return false;
    }

    // Comisión por producto específico
    if (comision.aplica_a === "producto") {
      if (!venta.ventas_items || venta.ventas_items.length === 0) return false;

      return venta.ventas_items.some(
        (item) => item.producto_id === comision.referencia_id
      );
    }

    return false;
  },

  /**
   * Calcular comisiones totales por vendedor en un período
   * NOTA: Esta función debería ejecutarse en el backend para manejar grandes volúmenes
   * Por ahora se mantiene como método local que calcula en el frontend
   */
  async calcularComisionesPorVendedor(fechaInicio, fechaFin, tiendaId = null) {
    try {
      // Esta función es compleja y debería moverse al backend
      // Por ahora, retornamos un mensaje indicando que debe implementarse
      console.warn(
        "calcularComisionesPorVendedor: Esta función debería ejecutarse en el backend"
      );

      throw new Error(
        "Esta función debe implementarse como endpoint del backend para manejar grandes volúmenes de datos"
      );
    } catch (error) {
      console.error("Error al calcular comisiones por vendedor:", error);
      throw new Error(
        error.message || "Error al calcular comisiones por vendedor"
      );
    }
  },

  /**
   * Obtener comisiones aplicables a un empleado específico
   */
  async obtenerComisionesEmpleado(empleadoId) {
    try {
      const response = await fetch(
        `${API_BASE}/comisiones/empleado/${empleadoId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Error al cargar comisiones del empleado"
        );
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error al obtener comisiones del empleado:", error);
      throw new Error(
        error.message || "Error al cargar comisiones del empleado"
      );
    }
  },
};
