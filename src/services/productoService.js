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

/**
 * Crea un nuevo producto con variantes usando la Function.
 * @param {{ nombre, descripcion, categoria, precioBase, tieneVariantes, imagenes }} data
 */
export async function crearProducto(data) {
  const headers = await authHeaders();
  const res = await axios.post(`${BASE}/productos`, data, { headers });
  return res.data;
}

/**
 * Obtiene lista de todos los productos.
 */
export async function obtenerProductos() {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/productos`, { headers });
  return res.data;
}

/**
 * Obtiene un producto por su ID.
 */
export async function obtenerProducto(id) {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/productos/${id}`, { headers });
  return res.data;
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
