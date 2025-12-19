// src/services/supabase/ventaService.js

import { FUNCTIONS_URL } from "../../utils/constants";

const API_URL = FUNCTIONS_URL + "/ventas";

export class VentaService {
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
   * Crear una nueva venta
   */
  static async crearVenta(ventaData) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(ventaData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      console.error("📡 [VentaService] crearVenta - Error:", error);
      throw new Error(error.message || "Error al crear la venta");
    }

    const result = await response.json();
    console.log("📡 [VentaService] crearVenta - Resultado:", result);
    return result;
  }

  /**
   * Obtener todas las ventas (con filtros opcionales)
   */
  static async obtenerVentas(filtros = {}) {
    const params = new URLSearchParams(filtros);
    const fullUrl = `${API_URL}?${params}`;

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener ventas");
    }

    return await response.json();
  }

  /**
   * Obtener una venta por ID
   */
  static async obtenerVentaPorId(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener la venta");
    }

    return await response.json();
  }

  /**
   * Cancelar una venta
   */
  static async cancelarVenta(id, motivo) {
    const response = await fetch(`${API_URL}/${id}/cancelar`, {
      method: "PUT",
      headers: this._getAuthHeaders(),
      body: JSON.stringify({ motivo }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al cancelar la venta");
    }

    return await response.json();
  }

  /**
   * Actualizar el vendedor de una venta (solo admin)
   */
  static async actualizarVendedor(ventaId, nuevoUsuarioId) {
    const response = await fetch(`${API_URL}/${ventaId}/vendedor`, {
      method: "PUT",
      headers: this._getAuthHeaders(),
      body: JSON.stringify({ usuario_id: nuevoUsuarioId }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al actualizar vendedor");
    }

    return await response.json();
  }

  /**
   * Buscar variantes por SKU o nombre (para el carrito)
   * Busca en inventario_global (muestra todo el inventario disponible)
   */
  static async buscarVariantes(termino) {
    console.log("📡 [VentaService] buscarVariantes - Término:", termino);

    const url = `${API_URL}/buscar-variantes?q=${encodeURIComponent(termino)}`;

    console.log("📡 [VentaService] buscarVariantes - URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    console.log(
      "📡 [VentaService] buscarVariantes - Response status:",
      response.status
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }

      const error = await response.json();
      console.error("📡 [VentaService] buscarVariantes - Error:", error);

      // Si es 404 (no hay inventario), lanzar error con el mensaje
      if (response.status === 404 && error.sin_inventario) {
        throw new Error(
          error.message || "No hay inventario disponible de ese producto"
        );
      }

      throw new Error(error.message || "Error al buscar variantes");
    }

    const result = await response.json();
    console.log("📡 [VentaService] buscarVariantes - Resultado:", result);
    return result;
  }

  /**
   * Obtener ventas pendientes de pago (tickets generados)
   */
  static async obtenerVentasPendientes(tienda_id = null) {
    const url = tienda_id
      ? `${API_URL}/pendientes?tienda_id=${tienda_id}`
      : `${API_URL}/pendientes`;

    const response = await fetch(url, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener ventas pendientes");
    }

    return await response.json();
  }

  /**
   * Buscar una venta por folio
   */
  static async buscarPorFolio(folio) {
    const response = await fetch(`${API_URL}/folio/${folio}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 404) {
        throw new Error("Ticket no encontrado");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al buscar ticket");
    }

    const result = await response.json();
    return result;
  }

  /**
   * Cobrar una venta pendiente (procesar ticket)
   */
  static async cobrarVentaPendiente(ventaId, metodoPago) {
    const response = await fetch(`${API_URL}/${ventaId}/cobrar`, {
      method: "PUT",
      headers: this._getAuthHeaders(),
      body: JSON.stringify({ metodo_pago: metodoPago }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      console.error("📡 [VentaService] cobrarVentaPendiente - Error:", error);
      throw new Error(error.message || "Error al cobrar el ticket");
    }

    const result = await response.json();
    return result;
  }
}
