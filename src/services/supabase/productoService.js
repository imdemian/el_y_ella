// frontend/src/services/productoService.js
import { FUNCTIONS_URL } from "../../utils/constants";

const API_BASE = FUNCTIONS_URL;

export class ProductoService {
  static async listarProductos(token, pagina = 1, limite = 20, busqueda = "") {
    const params = new URLSearchParams({
      page: pagina,
      limit: limite,
      ...(busqueda && { search: busqueda }),
    });

    const response = await fetch(`${API_BASE}/productos?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error obteniendo productos");
    }

    return await response.json();
  }

  static async buscarProductos(token, termino, limite = 10) {
    const response = await fetch(
      `${API_BASE}/productos/search/quick?q=${encodeURIComponent(
        termino
      )}&limit=${limite}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Error buscando productos");
    }

    return await response.json();
  }

  static async escanearProducto(token, sku) {
    const response = await fetch(`${API_BASE}/tpv/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sku }),
    });

    if (!response.ok) {
      throw new Error("Error escaneando producto");
    }

    return await response.json();
  }
}
