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

/** Arma querystring limpio (omite null/undefined/"" y booleans como 1/0) */
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
 * GET /inventario/global
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
  return data; // { success, items, nextStartAfter }
}

/**
 * Inventario por tienda (índice)
 * GET /inventario/tienda
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
  return data; // { success, items, nextStartAfter }
}

/**
 * Agregado puntual por variante (global)
 * GET /inventario/variante/:variantId
 */
export async function obtenerInventarioPorVariante(variantId) {
  const headers = await authHeaders();
  const { data } = await axios.get(`${BASE}/inventario/variante/${variantId}`, {
    headers,
  });
  return data; // { success, id, ...campos del agg }
}

/**
 * Agregado global por PRODUCTO (todas las variantes de ese producto)
 * GET /inventario/producto/:productId
 */
export async function obtenerInventarioGlobalPorProducto(productId, opts = {}) {
  const headers = await authHeaders();
  const query = buildQuery({
    limit: opts.limit ?? 50,
    startAfter: opts.startAfter,
    includeStores: !!opts.includeStores,
  });
  const { data } = await axios.get(
    `${BASE}/inventario/producto/${productId}${query}`,
    { headers }
  );
  return data; // { success, items, next }
}

/**
 * Inventario por PRODUCTO en una TIENDA (todas las variantes del producto en esa tienda)
 * GET /inventario/tienda/producto/:productId?storeId=...&lowStock=1
 */
export async function obtenerInventarioDeTiendaPorProducto(
  productId,
  { storeId, limit = 50, startAfter, lowStock = false } = {}
) {
  if (!storeId) throw new Error("storeId es requerido");
  const headers = await authHeaders();
  const query = buildQuery({
    storeId,
    limit,
    startAfter,
    lowStock: !!lowStock,
  });
  const { data } = await axios.get(
    `${BASE}/inventario/tienda/producto/${productId}${query}`,
    { headers }
  );
  return data; // { success, items, next }
}

/**
 * Set de stock/min para una variante en una tienda (ajuste manual)
 * PUT /inventario/tiendas/:storeId/variantes/:variantId
 */
export async function setStockVarianteEnTienda(storeId, variantId, body) {
  const headers = await authHeaders();
  const { data } = await axios.put(
    `${BASE}/inventario/tiendas/${storeId}/variantes/${variantId}`,
    body,
    { headers }
  );
  return data; // { success, message }
}

/**
 * Transferir stock entre tiendas
 * POST /inventario/transfer
 */
export async function transferirInventario(body) {
  const headers = await authHeaders();
  const { data } = await axios.post(`${BASE}/inventario/transfer`, body, {
    headers,
  });
  return data; // { success, message }
}

/* ===== Helpers para escáner (SKU/Barcode) ===== */

export async function buscarVariantePorSKU(
  sku,
  { includeStores = false } = {}
) {
  return obtenerInventarioGlobal({ sku, includeStores, limit: 1 });
}

export async function buscarVariantePorBarcode(
  barcode,
  { includeStores = false } = {}
) {
  return obtenerInventarioGlobal({ barcode, includeStores, limit: 1 });
}
