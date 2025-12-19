// src/services/supabase/apartadoService.js

import { FUNCTIONS_URL } from "../../utils/constants";

const API_URL = FUNCTIONS_URL + "/apartados";

export class ApartadoService {
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
   * Obtener lista de apartados con filtros
   */
  static async obtenerApartados(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.estado) params.append("estado", filtros.estado);
    if (filtros.tienda_id) params.append("tienda_id", filtros.tienda_id);
    if (filtros.fecha_inicio)
      params.append("fecha_inicio", filtros.fecha_inicio);
    if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);
    if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
    if (filtros.limit) params.append("limit", filtros.limit);
    if (filtros.offset) params.append("offset", filtros.offset);

    const url = `${API_URL}?${params}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener apartados");
    }

    const result = await response.json();
    // El backend devuelve { data: [...], pagination: {...} }
    return result.data || [];
  }

  /**
   * Obtener un apartado por ID
   */
  static async obtenerApartadoPorId(id) {
    console.log("📡 [ApartadoService] obtenerApartadoPorId - ID:", id);

    const response = await fetch(`${API_URL}/${id}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 404) {
        throw new Error("Apartado no encontrado");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener apartado");
    }

    return await response.json();
  }

  /**
   * Buscar apartado por folio
   */
  static async buscarPorFolio(folio) {
    console.log("📡 [ApartadoService] buscarPorFolio - Folio:", folio);

    const response = await fetch(
      `${API_URL}/folio/${encodeURIComponent(folio)}`,
      {
        method: "GET",
        headers: this._getAuthHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 404) {
        throw new Error("Apartado no encontrado");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al buscar apartado");
    }

    return await response.json();
  }

  /**
   * Crear un nuevo apartado
   */
  static async crearApartado(apartadoData) {
    console.log("📡 [ApartadoService] crearApartado - Datos:", apartadoData);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(apartadoData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      console.error("📡 [ApartadoService] crearApartado - Error:", error);
      throw new Error(error.message || "Error al crear apartado");
    }

    const result = await response.json();
    console.log("📡 [ApartadoService] crearApartado - Resultado:", result);
    return result;
  }

  /**
   * Registrar un abono a un apartado
   */
  static async registrarAbono(apartadoId, abonoData) {
    console.log("📡 [ApartadoService] registrarAbono - ID:", apartadoId);
    console.log("📡 [ApartadoService] registrarAbono - Datos:", abonoData);

    const response = await fetch(`${API_URL}/${apartadoId}/abono`, {
      method: "POST",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(abonoData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      console.error("📡 [ApartadoService] registrarAbono - Error:", error);
      throw new Error(error.message || "Error al registrar abono");
    }

    const result = await response.json();
    console.log("📡 [ApartadoService] registrarAbono - Resultado:", result);
    return result;
  }

  /**
   * Actualizar un apartado
   */
  static async actualizarApartado(id, apartadoData) {
    console.log("📡 [ApartadoService] actualizarApartado - ID:", id);

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(apartadoData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al actualizar apartado");
    }

    return await response.json();
  }

  /**
   * Cambiar estado de un apartado
   */
  static async cambiarEstado(id, estado) {
    console.log(
      "📡 [ApartadoService] cambiarEstado - ID:",
      id,
      "Estado:",
      estado
    );

    const response = await fetch(`${API_URL}/${id}/estado`, {
      method: "PUT",
      headers: this._getAuthHeaders(),
      body: JSON.stringify({ estado }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al cambiar estado");
    }

    return await response.json();
  }

  /**
   * Obtener historial de abonos de un apartado
   */
  static async obtenerAbonos(apartadoId) {
    console.log("📡 [ApartadoService] obtenerAbonos - ID:", apartadoId);

    const response = await fetch(`${API_URL}/${apartadoId}/abonos`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener abonos");
    }

    return await response.json();
  }

  /**
   * Obtener catálogo de arreglos
   */
  static async obtenerCatalogoArreglos() {
    console.log("📡 [ApartadoService] obtenerCatalogoArreglos");

    const response = await fetch(`${API_URL}/catalogo-arreglos`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener catálogo de arreglos");
    }

    return await response.json();
  }
}
