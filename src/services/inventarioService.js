// src/services/inventarioService.js
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

/** Helper para armar querystring limpio (omite null/undefined/""/false) */
function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    if (typeof v === "boolean") qs.set(k, v ? "1" : "0");
    else qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Inventario global (agregado por variante)
 * @param {Object} opts
 * @param {number} [opts.limit=50]
 * @param {string} [opts.startAfter] - cursor para paginación
 * @param {string} [opts.q] - prefijo por nombre de producto (case-insensitive)
 * @param {string} [opts.categoryId]
 * @param {string} [opts.sku]
 * @param {string} [opts.barcode]
 * @param {string} [opts.variantId]
 * @param {boolean} [opts.includeStores=false] - incluir mapa stores por variante
 * @returns {Promise<{success:boolean, items:Array, next:string|null}>}
 */
export async function obtenerInventarioGlobal(opts = {}) {
  const headers = await authHeaders();
  const query = buildQuery({
    limit: opts.limit ?? 50,
    startAfter: opts.startAfter,
    q: opts.q,
    categoryId: opts.categoryId,
    sku: opts.sku,
    barcode: opts.barcode,
    variantId: opts.variantId,
    includeStores: !!opts.includeStores,
  });
  const { data } = await axios.get(`${BASE}/inventario/global${query}`, {
    headers,
  });
  return data;
}

/**
 * Inventario por tienda (índice rápido)
 * @param {Object} opts
 * @param {string} opts.storeId (requerido)
 * @param {number} [opts.limit=50]
 * @param {string} [opts.startAfter]
 * @param {string} [opts.q]
 * @param {string} [opts.categoryId]
 * @param {string} [opts.sku]
 * @param {string} [opts.barcode]
 * @param {string} [opts.variantId]
 * @param {boolean} [opts.lowStock=false] - sólo faltantes (stock <= min)
 * @returns {Promise<{success:boolean, items:Array, next:string|null}>}
 */
export async function obtenerInventarioDeTienda(opts = {}) {
  if (!opts.storeId) throw new Error("storeId es requerido");
  const headers = await authHeaders();
  const query = buildQuery({
    storeId: opts.storeId,
    limit: opts.limit ?? 50,
    startAfter: opts.startAfter,
    q: opts.q,
    categoryId: opts.categoryId,
    sku: opts.sku,
    barcode: opts.barcode,
    variantId: opts.variantId,
    lowStock: !!opts.lowStock,
  });
  const { data } = await axios.get(`${BASE}/inventario/tienda${query}`, {
    headers,
  });
  return data;
}

/**
 * Ficha agregada de una variante (total global + metadata)
 * @param {string} variantId
 * @returns {Promise<{success:boolean, item:Object}>}
 */
export async function obtenerInventarioPorVariante(variantId) {
  const headers = await authHeaders();
  const { data } = await axios.get(`${BASE}/inventario/${variantId}`, {
    headers,
  });
  return data;
}

/**
 * Set de stock/min para una variante en una tienda (ajuste manual)
 * @param {string} storeId
 * @param {string} variantId
 * @param {{ productId:string, stock:number, minimoStock:number }} body
 * @returns {Promise<{success:boolean, item:Object}>}
 */
export async function setStockVarianteEnTienda(storeId, variantId, body) {
  const headers = await authHeaders();
  const { data } = await axios.put(
    `${BASE}/inventario/tiendas/${storeId}/variantes/${variantId}`,
    body,
    { headers }
  );
  return data;
}

/**
 * Transferir stock entre tiendas
 * @param {{ productId:string, variantId:string, fromStoreId:string, toStoreId:string, quantity:number, motivo?:string }} body
 * @returns {Promise<{success:boolean, moved:number, correlacionId:string}>}
 */
export async function transferirInventario(body) {
  const headers = await authHeaders();
  const { data } = await axios.post(`${BASE}/inventario/transfer`, body, {
    headers,
  });
  return data;
}
