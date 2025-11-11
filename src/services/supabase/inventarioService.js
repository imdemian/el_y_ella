// src/services/supabase/inventarioService.js

const API_URL =
  "http://localhost:5001/elyella-d411f/us-central1/api/supabase/inventario";

export class InventarioService {
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
   * Construye query params limpios
   */
  static _buildQuery(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (typeof v === "string" && v.trim() === "") return;
      if (typeof v === "boolean") qs.set(k, v ? "true" : "false");
      else qs.set(k, String(v));
    });
    const s = qs.toString();
    return s ? `?${s}` : "";
  }

  /* ======================= INVENTARIO GLOBAL ======================= */

  /**
   * GET /inventario/global
   * Obtener inventario global con filtros
   */
  static async obtenerInventarioGlobal(filtros = {}) {
    const query = this._buildQuery(filtros);
    const response = await fetch(`${API_URL}/global${query}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(
        `Error al obtener inventario global: ${response.statusText}`
      );
    }
    return await response.json();
  }

  /**
   * GET /inventario/global/:variante_id
   * Obtener inventario global de una variante específica
   */
  static async obtenerInventarioPorVariante(varianteId) {
    const response = await fetch(`${API_URL}/global/${varianteId}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(
        `Error al obtener inventario de variante: ${response.statusText}`
      );
    }
    return await response.json();
  }

  /**
   * PUT /inventario/global/:variante_id
   * Actualizar inventario global (admin/manager)
   */
  static async actualizarInventarioGlobal(varianteId, datos) {
    const response = await fetch(`${API_URL}/global/${varianteId}`, {
      method: "PUT",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    if (!response.ok) {
      throw new Error(
        `Error al actualizar inventario global: ${response.statusText}`
      );
    }
    return await response.json();
  }

  /* ======================= INVENTARIO POR TIENDA ======================= */

  /**
   * GET /inventario/tienda/:tienda_id
   * Obtener inventario de una tienda
   */
  static async obtenerInventarioDeTienda(tiendaId, filtros = {}) {
    const query = this._buildQuery(filtros);
    const response = await fetch(`${API_URL}/tienda/${tiendaId}${query}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(
        `Error al obtener inventario de tienda: ${response.statusText}`
      );
    }
    return await response.json();
  }

  /**
   * GET /inventario/tienda/:tienda_id/variante/:variante_id
   * Obtener inventario de variante en tienda específica
   */
  static async obtenerInventarioVarianteEnTienda(tiendaId, varianteId) {
    const response = await fetch(
      `${API_URL}/tienda/${tiendaId}/variante/${varianteId}`,
      {
        method: "GET",
        headers: this._getAuthHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error(
        `Error al obtener inventario de variante en tienda: ${response.statusText}`
      );
    }
    return await response.json();
  }

  /**
   * PUT /inventario/tienda/:tienda_id/variante/:variante_id
   * Actualizar inventario de variante en tienda
   */
  static async actualizarInventarioDeTienda(tiendaId, varianteId, datos) {
    const response = await fetch(
      `${API_URL}/tienda/${tiendaId}/variante/${varianteId}`,
      {
        method: "PUT",
        headers: this._getAuthHeaders(),
        body: JSON.stringify(datos),
      }
    );
    if (!response.ok) {
      throw new Error(
        `Error al actualizar inventario de tienda: ${response.statusText}`
      );
    }
    return await response.json();
  }

  /* ======================= MOVIMIENTOS DE INVENTARIO ======================= */

  /**
   * POST /inventario/movimiento
   * Registrar un movimiento de inventario
   */
  static async registrarMovimiento(movimiento) {
    const response = await fetch(`${API_URL}/movimiento`, {
      method: "POST",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(movimiento),
    });
    if (!response.ok) {
      throw new Error(`Error al registrar movimiento: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * GET /inventario/movimientos
   * Obtener historial de movimientos
   */
  static async obtenerMovimientos(filtros = {}) {
    const query = this._buildQuery(filtros);
    const response = await fetch(`${API_URL}/movimientos${query}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Error al obtener movimientos: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * POST /inventario/transferencia
   * Transferir inventario entre tiendas
   */
  static async transferirInventario(transferencia) {
    const response = await fetch(`${API_URL}/transferencia`, {
      method: "POST",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(transferencia),
    });
    if (!response.ok) {
      throw new Error(`Error al transferir inventario: ${response.statusText}`);
    }
    return await response.json();
  }

  /* ======================= ESTADÍSTICAS ======================= */

  /**
   * GET /inventario/estadisticas
   * Obtener estadísticas del inventario
   */
  static async obtenerEstadisticas() {
    const response = await fetch(`${API_URL}/estadisticas`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Error al obtener estadísticas: ${response.statusText}`);
    }
    return await response.json();
  }

  /* ======================= HELPERS DE BÚSQUEDA ======================= */

  /**
   * Buscar variante por SKU
   */
  static async buscarVariantePorSKU(sku) {
    const response = await fetch(
      `${API_URL}/buscar-variante/${encodeURIComponent(sku)}`,
      {
        method: "GET",
        headers: this._getAuthHeaders(),
      }
    );
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error al buscar variante: ${response.statusText}`);
    }
    const result = await response.json();

    // Si es respuesta múltiple, retornar el array
    if (result.multiple && result.data) {
      return result.data;
    }

    // Si es resultado único, retornar el objeto
    return result.data || null;
  }

  /**
   * Buscar productos con bajo stock
   */
  static async obtenerProductosConBajoStock(filtros = {}) {
    return await this.obtenerInventarioGlobal({
      ...filtros,
      bajo_minimo: true,
    });
  }

  /**
   * Buscar productos sin stock
   */
  static async obtenerProductosSinStock(filtros = {}) {
    return await this.obtenerInventarioGlobal({
      ...filtros,
      sin_stock: true,
    });
  }

  /* ======================= NUEVOS MÉTODOS ======================= */

  /**
   * POST /inventario/crear
   * Crear inventario para una tienda
   */
  static async crearInventarioTienda(datos) {
    const response = await fetch(`${API_URL}/crear`, {
      method: "POST",
      headers: this._getAuthHeaders(),
      body: JSON.stringify(datos),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al crear inventario en tienda");
    }
    return await response.json();
  }

  /**
   * GET /inventario/distribucion/:varianteId
   * Obtener distribución de una variante por tiendas
   * Retorna: { data: [...tiendas], variante: {...info_global} }
   */
  static async obtenerDistribucionVariante(varianteId) {
    console.log(`📡 Llamando GET ${API_URL}/distribucion/${varianteId}`);
    const response = await fetch(`${API_URL}/distribucion/${varianteId}`, {
      method: "GET",
      headers: this._getAuthHeaders(),
    });

    console.log(
      `📥 Response status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error response:", errorText);
      throw new Error(`Error al obtener distribución: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Datos recibidos:", result);

    // Retornar el objeto completo con data y variante
    return {
      data: result.data || [],
      variante: result.variante || null,
    };
  }
}

export default InventarioService;
