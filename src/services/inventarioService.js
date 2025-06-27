import axios from "axios";

const BASE = import.meta.env.DEV
  ? import.meta.env.VITE_FUNCTIONS_EMULATOR_URL
  : `https://us-central1-${
      import.meta.env.VITE_FIREBASE_PROJECT_ID
    }.cloudfunctions.net/api`;

/**
 * Agrega un producto/variante al inventario de una tienda
 * @param {string} tiendaId
 * @param {{ productoId: string, varianteId: string, cantidad: number, minimoStock?: number }} data
 */
export const agregarInventario = async (tiendaId, data) => {
  const resp = await axios.post(`${BASE}/${tiendaId}/inventario`, data);
  return resp.data; // { success: true, id }
};

/**
 * Obtiene el inventario de una tienda, opcionalmente filtrado por producto
 * @param {string} tiendaId
 * @param {string} [productoId]
 */
export const obtenerInventario = async (tiendaId, productoId) => {
  const url = `${BASE}/${tiendaId}/inventario${
    productoId ? `?productoId=${productoId}` : ""
  }`;
  const resp = await axios.get(url);
  return resp.data.inventario; // { success: true, inventario: [...] }
};
