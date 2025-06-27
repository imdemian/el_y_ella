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
 * @param {{ nombre: string, direccion: string, [otrosCampos]: any }} payload
 */
export async function crearTienda(payload) {
  const headers = await authHeaders();
  const { data } = await axios.post(`${BASE}/tiendas`, payload, { headers });
  return data;
}

/**
 * Actualiza los datos de una tienda existente.
 * @param {string} id
 * @param {{ nombre?: string, direccion?: string, [otrosCampos]: any }} payload
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
 * @param {string} id
 */
export async function eliminarTienda(id) {
  const headers = await authHeaders();
  await axios.delete(`${BASE}/tiendas/${id}`, { headers });
}
