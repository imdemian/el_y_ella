// src/services/productoService.js
import axios from "axios";
import { getIdTokenForUser } from "./authService";

const BASE = import.meta.env.DEV
  ? import.meta.env.VITE_FUNCTIONS_EMULATOR_URL
  : `https://us-central1-${
      import.meta.env.VITE_FIREBASE_PROJECT_ID
    }.cloudfunctions.net/api`;

async function authHeaders() {
  const token = await getIdTokenForUser();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/*=========================
  CRUD Producto
=========================*/

/**
 * Crea un nuevo producto.
 */
export async function crearProducto(data) {
  const headers = await authHeaders();
  const res = await axios.post(`${BASE}/productos`, data, { headers });
  return res.data;
}

/**
 * Obtiene lista de productos (no paginada).
 * Úsalo solo para listados pequeños o debugging.
 */
export async function obtenerProductos() {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/productos`, { headers });
  return res.data; // { success, productos, nextStartAfter? }
}

/**
 * Obtiene lista de productos paginada.
 * @param {number} limit - Cuántos productos traer (por defecto 20)
 * @param {string|null} startAfterId - ID del último producto traído
 * @param {"full"|"slim"} mode - "slim" NO incluye variantes (payload ligero)
 */
export async function obtenerProductosPaginado(
  limit = 20,
  startAfterId = null,
  mode = "slim"
) {
  const headers = await authHeaders();
  const params = new URLSearchParams({ limit, mode });
  if (startAfterId) params.append("startAfter", startAfterId);

  const res = await axios.get(`${BASE}/productos?${params.toString()}`, {
    headers,
  });
  return res.data; // { success, productos, nextStartAfter }
}

/**
 * Obtiene un producto por su ID (incluye variantes).
 */
export async function obtenerProducto(id) {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/productos/${id}`, { headers });
  return res.data; // { id, ... , variantes: [...] }
}

/**
 * Actualiza un producto por su ID.
 */
export async function actualizarProducto(id, data) {
  const headers = await authHeaders();
  const res = await axios.put(`${BASE}/productos/${id}`, data, { headers });
  return res.data;
}

/**
 * Elimina un producto por su ID.
 */
export async function eliminarProducto(id) {
  const headers = await authHeaders();
  const res = await axios.delete(`${BASE}/productos/${id}`, { headers });
  return res.data;
}

/*=========================
  Búsqueda server-side
=========================*/

/**
 * Busca productos por prefijo de nombre (nombreLower) y opcionalmente por categoría.
 * Devuelve lista SLIM (sin variantes). Para variantes, luego usa obtenerProducto(id).
 * @param {{ q?: string, categoriaId?: string, limit?: number, startAfter?: string }} params
 * @returns {Promise<{success:boolean, items:Array, next:string|null}>}
 */
export async function buscarProductos(params = {}) {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/productos/search`, { headers, params });
  return res.data;
}

/*=========================
  Lookups directos (O(1))
=========================*/

/**
 * Lookup por código de barras exacto (backend normaliza a UPPERCASE).
 * @returns {Promise<{success:boolean, productId:string, variantId:string, code:string}>}
 */
export async function lookupPorBarcode(code) {
  const headers = await authHeaders();
  const res = await axios.get(
    `${BASE}/productos/barcode/${encodeURIComponent(code)}`,
    { headers }
  );
  return res.data;
}

/**
 * Lookup por SKU exacto (backend normaliza a lowercase).
 * @returns {Promise<{success:boolean, productId:string, variantId:string, skuLower:string}>}
 */
export async function lookupPorSku(sku) {
  const headers = await authHeaders();
  const res = await axios.get(
    `${BASE}/productos/sku/${encodeURIComponent(sku)}`,
    { headers }
  );
  return res.data;
}

/*=========================
  Helpers opcionales
=========================*/

/**
 * Azúcar: busca una página slim y regresa el detalle del primero.
 */
export async function buscarYTraerDetallePrimero(q) {
  const { items = [] } = await buscarProductos({ q, limit: 1 });
  if (!items.length) return null;
  return await obtenerProducto(items[0].id);
}
