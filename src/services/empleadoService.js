// src/services/empleadosService.js
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
 * Obtiene todos los empleados.
 */
export async function obtenerEmpleados() {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/empleados`, { headers });
  return res.data;
}

/**
 * Obtiene un empleado por su ID.
 */
export async function obtenerEmpleado(id) {
  const headers = await authHeaders();
  const res = await axios.get(`${BASE}/empleados/${id}`, { headers });
  return res.data;
}

/**
 * Crea un nuevo empleado.
 * @param {{ nombre, rol, tiendaId, ... }} data
 */
export async function registrarEmpleado(data) {
  const headers = await authHeaders();
  const res = await axios.post(`${BASE}/empleados`, data, { headers });
  return res.data;
}

/**
 * Actualiza un empleado existente.
 */
export async function actualizarEmpleado(id, data) {
  const headers = await authHeaders();
  const res = await axios.put(`${BASE}/empleados/${id}`, data, { headers });
  return res.data;
}

/**
 * Elimina un empleado.
 */
export async function eliminarEmpleado(id) {
  const headers = await authHeaders();
  await axios.delete(`${BASE}/empleados/${id}`, { headers });
}
