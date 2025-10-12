// frontend/src/services/supabase/productoService.js
import { FUNCTIONS_URL } from "../../utils/constants";

const API_BASE = FUNCTIONS_URL;

export class ProductoService {
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
   * Listar productos con paginación y filtros
   * @param {Object} options - Opciones de filtrado
   * @param {number} options.page - Página actual
   * @param {number} options.limit - Límite por página
   * @param {string} options.search - Término de búsqueda
   * @param {string} options.categoria_id - ID de categoría
   * @param {boolean|string} options.activo - Filtro de activos
   * @param {string} options.order_by - Campo de ordenamiento
   * @param {string} options.order_dir - Dirección del ordenamiento
   */
  static async listarProductos(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        categoria_id,
        activo,
        order_by = "nombre",
        order_dir = "asc",
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        order_by,
        order_dir,
      });

      if (search) params.append("search", search);
      if (categoria_id) params.append("categoria_id", categoria_id);
      if (activo !== undefined) params.append("activo", activo.toString());

      const response = await fetch(`${API_BASE}/productos?${params}`, {
        headers: this._getAuthHeaders(),
      });

      if (response.status === 401) {
        throw new Error("No autorizado. Por favor, inicia sesión nuevamente.");
      }

      if (response.status === 403) {
        throw new Error("No tienes permisos para acceder a los productos.");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error obteniendo productos");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en listarProductos:", error);
      throw error;
    }
  }

  /**
   * Obtener un producto específico por ID
   * @param {string} id - ID del producto
   */
  static async obtenerProducto(id) {
    try {
      const response = await fetch(`${API_BASE}/productos/${id}`, {
        headers: this._getAuthHeaders(),
      });

      if (response.status === 404) {
        throw new Error("Producto no encontrado");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error obteniendo producto");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en obtenerProducto:", error);
      throw error;
    }
  }

  /**
   * Crear un nuevo producto con sus variantes
   * @param {Object} productoData - Datos del producto
   * @param {Object} productoData.producto - Información base del producto
   * @param {Array} productoData.variantes - Array de variantes del producto
   */
  static async crearProducto(productoData) {
    try {
      const response = await fetch(`${API_BASE}/productos`, {
        method: "POST",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(productoData),
      });

      if (response.status === 401) {
        throw new Error("No autorizado. Por favor, inicia sesión nuevamente.");
      }

      if (response.status === 403) {
        throw new Error("No tienes permisos para crear productos.");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error creando producto");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en crearProducto:", error);
      throw error;
    }
  }

  /**
   * Actualizar un producto existente
   * @param {string} id - ID del producto
   * @param {Object} productoData - Datos a actualizar
   */
  static async actualizarProducto(id, productoData) {
    try {
      console.log("🔧 ProductoService.actualizarProducto");
      console.log("   URL:", `${API_BASE}/productos/${id}`);
      console.log("   Payload:", productoData);

      const response = await fetch(`${API_BASE}/productos/${id}`, {
        method: "PUT",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(productoData),
      });

      console.log("   Status:", response.status);
      console.log("   Status Text:", response.statusText);

      if (response.status === 404) {
        throw new Error("Producto no encontrado");
      }

      if (!response.ok) {
        const error = await response.json();
        console.error("   Error del servidor:", error);
        throw new Error(error.error || "Error actualizando producto");
      }

      const resultado = await response.json();
      console.log("   Respuesta exitosa:", resultado);

      return resultado;
    } catch (error) {
      console.error("❌ Error en actualizarProducto:", error);
      throw error;
    }
  }

  /**
   * Desactivar un producto (soft delete)
   * @param {string} id - ID del producto
   */
  static async desactivarProducto(id) {
    try {
      const response = await fetch(`${API_BASE}/productos/${id}`, {
        method: "DELETE",
        headers: this._getAuthHeaders(),
      });

      if (response.status === 404) {
        throw new Error("Producto no encontrado");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error desactivando producto");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en desactivarProducto:", error);
      throw error;
    }
  }

  /**
   * Búsqueda rápida de productos (para TPV)
   * @param {string} termino - Término de búsqueda
   * @param {number} limite - Límite de resultados
   */
  static async buscarProductos(termino, limite = 10) {
    try {
      const response = await fetch(
        `${API_BASE}/productos/search/quick?q=${encodeURIComponent(
          termino
        )}&limit=${limite}`,
        {
          headers: this._getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error buscando productos");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en buscarProductos:", error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de productos
   */
  static async obtenerEstadisticas() {
    try {
      const response = await fetch(`${API_BASE}/productos/stats/overview`, {
        headers: this._getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error obteniendo estadísticas");
      }

      return await response.json();
    } catch (error) {
      console.error("Error en obtenerEstadisticas:", error);
      throw error;
    }
  }

  /**
   * Obtener productos activos
   */
  static async obtenerProductosActivos() {
    return this.listarProductos({ activo: true });
  }
}
