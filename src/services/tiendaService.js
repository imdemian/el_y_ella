// src/services/tiendasService.js
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

/**
 * Obtiene la lista de todas las tiendas.
 */
export async function obtenerTiendas() {
  const headers = await authHeaders();
  const { data } = await axios.get(`${BASE}/tiendas`, { headers });
  return data;
}

/**
 * Crea una nueva tienda.
 */
export async function crearTienda(payload) {
  const headers = await authHeaders();
  const { data } = await axios.post(`${BASE}/tiendas`, payload, { headers });
  return data;
}

/**
 * Actualiza los datos de una tienda existente.
 */
export async function actualizarTienda(id, payload) {
  const headers = await authHeaders();
  const { data } = await axios.put(`${BASE}/tiendas/${id}`, payload, {
    headers,
  });
  return data;
}

/**
 * Elimina una tienda por su ID.
 */
export async function eliminarTienda(id) {
  const headers = await authHeaders();
  await axios.delete(`${BASE}/tiendas/${id}`, { headers });
}

// --------------------------
// Gestión de Inventario
// --------------------------

/**
 * Obtiene el inventario de una tienda, opcionalmente filtrado por producto.
 * @param {string} tiendaId
 * @param {string} [productoId]
 */
export async function obtenerInventarioTienda(tiendaId, productoId) {
  const headers = await authHeaders();
  const url = `${BASE}/tiendas/${tiendaId}/inventario${
    productoId ? `?productoId=${productoId}` : ""
  }`;
  const { data } = await axios.get(url, { headers });
  return data.inventario;
}

/**
 * Agrega un registro de inventario a una tienda.
 * @param {string} tiendaId
 * @param {{ productoId: string, varianteId: string, cantidad: number, minimoStock?: number }} payload
 */
export async function agregarInventarioTienda(tiendaId, payload) {
  const headers = await authHeaders();
  const { data } = await axios.post(
    `${BASE}/tiendas/${tiendaId}/inventario`,
    payload,
    { headers }
  );
  return data;
}

/**
 * Actualiza un registro de inventario existente en una tienda.
 * @param {string} tiendaId
 * @param {string} inventarioId
 * @param {{ stock: number, minimoStock?: number }} payload
 */
export async function actualizarInventarioTienda(
  tiendaId,
  inventarioId,
  payload
) {
  const headers = await authHeaders();
  const { data } = await axios.put(
    `${BASE}/tiendas/${tiendaId}/inventario/${inventarioId}`,
    payload,
    { headers }
  );
  return data;
}

/**
 * Obtiene el historial de logs de inventario de una tienda.
 * @param {string} tiendaId
 */
export async function obtenerLogsInventarioTienda(tiendaId) {
  const headers = await authHeaders();
  const { data } = await axios.get(
    `${BASE}/tiendas/${tiendaId}/logs_inventario`,
    { headers }
  );
  return data.logs;
}
