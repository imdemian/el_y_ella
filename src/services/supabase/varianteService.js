// src/services/supabase/varianteService.js

const API_URL =
  "http://localhost:5001/elyella-d411f/us-central1/api/supabase/variantes";

export class VarianteService {
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
   * Obtener todas las variantes (con filtros opcionales)
   */
  static async obtenerVariantes(filtros = {}) {
    // Por defecto, traer todas las variantes (activo = all)
    const defaultFiltros = { activo: "all", ...filtros };
    const params = new URLSearchParams(defaultFiltros);
    const response = await fetch(`${API_URL}?${params}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener variantes");
    }

    const result = await response.json();
    console.log("Resultado del backend:", result);

    // El backend devuelve { data, pagination, filters }
    // Para el componente de códigos de barra, solo necesitamos los datos con información del producto
    return result.data.map((v) => ({
      ...v,
      nombre_producto: v.productos?.nombre || "Sin nombre",
      categoria_id: v.productos?.categorias?.id,
      stock_actual: v.inventario_global?.cantidad_disponible || 0,
      stock_minimo: v.inventario_global?.minimo_stock || 0,
    }));
  }

  /**
   * Obtener todas las variantes de un producto
   */
  static async obtenerVariantesProducto(productoId) {
    const response = await fetch(`${API_URL}?producto_id=${productoId}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 404) {
        throw new Error("Producto no encontrado");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener variantes");
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Obtener una variante específica por ID
   */
  static async obtenerVariante(varianteId) {
    const response = await fetch(`${API_URL}/${varianteId}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 404) {
        throw new Error("Variante no encontrada");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener variante");
    }

    return await response.json();
  }

  /**
   * Crear una nueva variante
   */
  static async crearVariante(varianteData) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(varianteData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 403) {
        throw new Error("No tienes permisos para crear variantes");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Datos de variante inválidos");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al crear variante");
    }

    return await response.json();
  }

  /**
   * Actualizar una variante existente
   */
  static async actualizarVariante(varianteId, varianteData) {
    const response = await fetch(`${API_URL}/${varianteId}`, {
      method: "PUT",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(varianteData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 403) {
        throw new Error("No tienes permisos para actualizar variantes");
      }
      if (response.status === 404) {
        throw new Error("Variante no encontrada");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Datos de variante inválidos");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al actualizar variante");
    }

    return await response.json();
  }

  /**
   * Desactivar una variante (soft delete)
   */
  static async desactivarVariante(varianteId) {
    const response = await fetch(`${API_URL}/${varianteId}/desactivar`, {
      method: "PATCH",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 403) {
        throw new Error("No tienes permisos para desactivar variantes");
      }
      if (response.status === 404) {
        throw new Error("Variante no encontrada");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al desactivar variante");
    }

    return await response.json();
  }

  /**
   * Obtener inventario de una variante
   */
  static async obtenerInventario(varianteId) {
    const response = await fetch(`${API_URL}/${varianteId}/inventario`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 404) {
        throw new Error("Inventario no encontrado");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener inventario");
    }

    return await response.json();
  }

  /**
   * Ajustar inventario de una variante
   */
  static async ajustarInventario(varianteId, ajusteData) {
    const response = await fetch(
      `${API_URL}/${varianteId}/inventario/ajustar`,
      {
        method: "POST",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(ajusteData),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 403) {
        throw new Error("No tienes permisos para ajustar inventario");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Datos de ajuste inválidos");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al ajustar inventario");
    }

    return await response.json();
  }

  /**
   * Transferir inventario entre tiendas
   */
  static async transferirInventario(varianteId, transferenciaData) {
    const response = await fetch(
      `${API_URL}/${varianteId}/inventario/transferir`,
      {
        method: "POST",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(transferenciaData),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("No autorizado. Por favor inicia sesión nuevamente.");
      }
      if (response.status === 403) {
        throw new Error("No tienes permisos para transferir inventario");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Datos de transferencia inválidos");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al transferir inventario");
    }

    return await response.json();
  }

  /**
   * Obtener historial de movimientos de inventario
   */
  static async obtenerMovimientos(varianteId, filtros = {}) {
    const params = new URLSearchParams(filtros);
    const response = await fetch(
      `${API_URL}/${varianteId}/movimientos?${params}`,
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
        throw new Error("Variante no encontrada");
      }
      const error = await response.json();
      throw new Error(error.message || "Error al obtener movimientos");
    }

    return await response.json();
  }
}
