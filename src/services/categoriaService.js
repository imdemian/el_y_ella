// src/services/categoriaService.js
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
 * Crea una nueva categoría
 * @param {{ nombre: string, descripcion?: string }} data
 * @returns {Promise<Object>} Datos de la categoría creada
 */
export const crearCategoria = async (data) => {
  const headers = await authHeaders();
  const res = await axios.post(`${BASE}/categorias`, data, { headers });
  return res.data; // { success: true, id, nombre, descripcion, createdAt, ... }
};

/**
 * Obtiene todas las categorías
 * @returns {Promise<Array>} Lista de categorías
 */
export const obtenerCategorias = async () => {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/categorias`, { headers });
  return res.data; // { success: true, categorias }
};
