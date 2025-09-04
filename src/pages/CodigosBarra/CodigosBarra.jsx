// src/pages/CodigosBarra.jsx
import React, { useCallback, useRef, useState } from "react";
import Barcode from "react-barcode";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import {
  buscarProductos,
  obtenerProducto,
  lookupPorBarcode,
  lookupPorSku,
} from "../../services/productoService";
import { toast } from "react-toastify";

// Config por defecto de la grilla de etiquetas
const DEFAULTS = {
  page: "a4", // "a4" | "letter"
  cols: 4, // columnas por página
  labelW: 48, // ancho (mm)
  labelH: 30, // alto (mm)
  marginL: 8, // margen izq (mm)
  marginT: 10, // margen sup (mm)
  gapX: 2, // separación x (mm)
  gapY: 2, // separación y (mm)
};

// Debounce simple
function useDebouncedCallback(cb, delay) {
  const ref = useRef();
  return useCallback(
    (...args) => {
      clearTimeout(ref.current);
      ref.current = setTimeout(() => cb(...args), delay);
    },
    [cb, delay]
  );
}

export default function CodigosBarra() {
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Resultados slim desde el servidor (sin variantes)
  const [resultados, setResultados] = useState([]); // [{id, nombre, ...}]
  const [next, setNext] = useState(null); // para "cargar más" si quieres extender

  // Producto seleccionado con variantes completas
  const [productoSel, setProductoSel] = useState(null); // { id, nombre, variantes: [...] }

  // Variantes elegidas para imprimir
  const [selecciones, setSelecciones] = useState([]);

  // Modo de valor de código a imprimir (barcode > sku > idVariante, o sku > barcode)
  const [prioridadValor, setPrioridadValor] = useState("barcodeFirst"); // "barcodeFirst" | "skuFirst"

  const toStr = (v) => (v == null ? "" : String(v));

  const variantLabel = (v) => {
    const attrs = v?.atributos || {};
    const parts = Object.entries(attrs).map(([k, val]) => `${k}: ${val}`);
    return parts.join(" · ");
  };

  const getPreferredCode = (v) => {
    const bar = toStr(v?.barcode);
    const sku = toStr(v?.sku);
    const id = toStr(v?.id);
    if (prioridadValor === "barcodeFirst") {
      return bar || sku || id;
    } else {
      return sku || bar || id;
    }
  };

  // ------- Buscar (server-side) con debounce
  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResultados([]);
      setNext(null);
      setProductoSel(null);
      return;
    }
    setLoading(true);
    try {
      const { items = [], next: nextCursor = null } = await buscarProductos({
        q,
        limit: 20,
      });
      setResultados(items);
      setNext(nextCursor);
      setProductoSel(null); // resetea el detalle al cambiar búsqueda
    } catch (err) {
      console.error(err);
      toast.error("Error buscando productos");
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useDebouncedCallback(doSearch, 300);

  // Maneja input del buscador
  const handleChangeBusqueda = (e) => {
    const val = e.target.value;
    setBusqueda(val);
    debouncedSearch(val);
  };

  // Enter en el buscador → intenta lookup directo por barcode/sku
  const handleKeyDownBusqueda = async (e) => {
    if (e.key !== "Enter") return;
    const q = busqueda.trim();
    if (!q) return;

    // Primero intentamos barcode, luego SKU
    try {
      setLoading(true);
      let hit;
      try {
        hit = await lookupPorBarcode(q);
      } catch {
        // intenta sku si barcode no está
        hit = await lookupPorSku(q.toLowerCase());
      }

      if (!hit || !hit.success) {
        toast.info("No se encontró producto/variante con ese código.");
        return;
      }

      // Trae el producto completo y agrega la variante a la lista
      await cargarProductoYAgregarVariante(hit.productId, hit.variantId);
      // Limpia búsqueda para nuevo escaneo rápido
      setBusqueda("");
      setResultados([]);
      setNext(null);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo resolver el código.");
    } finally {
      setLoading(false);
    }
  };

  const cargarProducto = async (id) => {
    setLoadingDetalle(true);
    try {
      const prod = await obtenerProducto(id);
      setProductoSel(prod);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando producto");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cargarProductoYAgregarVariante = async (productId, variantId) => {
    try {
      const prod = await obtenerProducto(productId);
      const v = (prod.variantes || []).find((x) => x.id === variantId);
      if (!v) {
        toast.error("La variante no existe en el producto.");
        return;
      }
      setProductoSel(prod);
      agregarVariante(prod, v);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo cargar el producto/variante");
    }
  };

  // Agregar / quitar / cantidad
  const agregarVariante = (producto, variante) => {
    const clave = `${producto.id}_${variante.id}`;
    if (!selecciones.some((s) => s.id === clave)) {
      setSelecciones((prev) => [
        ...prev,
        {
          id: clave,
          cantidad: 1,
          productoId: producto.id,
          varianteId: variante.id,
          sku: toStr(variante.sku),
          barcode: toStr(variante.barcode),
          precio: variante.precio ?? producto.precioBase ?? null,
          nombreProducto: toStr(producto.nombre),
          atributosTxt: variantLabel(variante),
        },
      ]);
    } else {
      // si ya existe, incrementa
      setSelecciones((prev) =>
        prev.map((s) =>
          s.id === clave ? { ...s, cantidad: s.cantidad + 1 } : s
        )
      );
    }
  };

  const actualizarCantidad = (clave, nuevaCantidad) => {
    setSelecciones((prev) =>
      prev.map((s) =>
        s.id === clave
          ? { ...s, cantidad: Math.max(1, Number(nuevaCantidad) || 1) }
          : s
      )
    );
  };

  const eliminarVariante = (clave) => {
    setSelecciones((prev) => prev.filter((s) => s.id !== clave));
  };

  const limpiarSelecciones = () => setSelecciones([]);

  // Resultados enriquecidos: si el usuario hace clic en un producto de resultados, cargamos su detalle
  const handleSelectProducto = async (id) => {
    await cargarProducto(id);
  };

  // ---------- PDF helpers
  const makeBarcodeDataURL = (valor, opts = {}) => {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, valor, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      width: 2,
      height: 30,
      ...opts,
    });
    return canvas.toDataURL("image/png");
  };

  const imprimirPDF = async (opciones = {}) => {
    if (selecciones.length === 0) {
      toast.info("No hay etiquetas para imprimir");
      return;
    }
    const {
      page = DEFAULTS.page,
      cols = DEFAULTS.cols,
      labelW = DEFAULTS.labelW,
      labelH = DEFAULTS.labelH,
      marginL = DEFAULTS.marginL,
      marginT = DEFAULTS.marginT,
      gapX = DEFAULTS.gapX,
      gapY = DEFAULTS.gapY,
      showSku = true,
      showProducto = false,
      showAtributos = true,
      showPrecio = false,
      fontSize = 8,
    } = opciones;

    const doc = new jsPDF({ unit: "mm", format: page });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const colW = labelW + gapX;
    const rowH = labelH + gapY;

    let x = marginL;
    let y = marginT;
    let col = 0;

    // Expandir según cantidad
    const etiquetas = [];
    selecciones.forEach((s) => {
      const total = Number(s.cantidad || 0);
      // Determina el valor a codificar según preferencia actual
      const value =
        prioridadValor === "barcodeFirst"
          ? toStr(s.barcode || s.sku || s.varianteId)
          : toStr(s.sku || s.barcode || s.varianteId);

      for (let i = 0; i < total; i++) {
        etiquetas.push({ ...s, value });
      }
    });

    etiquetas.forEach((s) => {
      if (!s.value) return;

      const png = makeBarcodeDataURL(s.value);
      const padding = 2;
      const innerW = labelW - padding * 2;

      // Calcula alturas: reserva ~5mm por línea de texto
      let textLines = 0;
      if (showProducto && s.nombreProducto) textLines++;
      if (showAtributos && s.atributosTxt) textLines++;
      if (showSku && (s.sku || s.varianteId)) textLines++;
      if (showPrecio && s.precio != null) textLines++;

      const textBlockH = textLines * 5;
      const barcodeH = Math.max(12, labelH - padding * 2 - textBlockH);

      // doc.rect(x, y, labelW, labelH); // (debug) marco
      doc.addImage(png, "PNG", x + padding, y + padding, innerW, barcodeH);

      let ty = y + padding + barcodeH + 3;
      doc.setFontSize(fontSize);
      const center = x + labelW / 2;

      if (showProducto && s.nombreProducto) {
        doc.text(toStr(s.nombreProducto), center, ty, {
          align: "center",
          maxWidth: innerW,
        });
        ty += 5;
      }
      if (showAtributos && s.atributosTxt) {
        doc.text(toStr(s.atributosTxt), center, ty, {
          align: "center",
          maxWidth: innerW,
        });
        ty += 5;
      }
      if (showSku) {
        doc.text(toStr(s.sku || s.varianteId), center, ty, {
          align: "center",
          maxWidth: innerW,
        });
        ty += 5;
      }
      if (showPrecio && s.precio != null) {
        doc.text(`$${Number(s.precio).toFixed(2)}`, center, y + labelH - 2, {
          align: "center",
        });
      }

      // Avanza grilla
      col++;
      if (col >= cols) {
        col = 0;
        x = marginL;
        y += rowH;
        if (y + labelH + marginT > pageH) {
          doc.addPage();
          y = marginT;
        }
      } else {
        x += colW;
        if (x + labelW + marginL > pageW) {
          col = 0;
          x = marginL;
          y += rowH;
          if (y + labelH + marginT > pageH) {
            doc.addPage();
            y = marginT;
          }
        }
      }
    });

    doc.save("etiquetas.pdf");
  };

  // Render
  return (
    <div className="container mt-4">
      <h2>Gestor de Códigos de Barras</h2>

      <div className="row mt-3">
        {/* Buscador y resultados (server-side) */}
        <div className="col-md-6">
          <div className="d-flex justify-content-between align-items-end">
            <div style={{ flex: 1, marginRight: 12 }}>
              <label className="form-label">Buscar</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre, ID, SKU, Barcode, talla/color… (Enter para escanear)"
                value={busqueda}
                onChange={handleChangeBusqueda}
                onKeyDown={handleKeyDownBusqueda}
                disabled={loading}
              />
              <small className="text-muted">
                Consejos: escribe al menos 2 caracteres para buscar. Presiona
                <strong> Enter</strong> para resolver <em>barcode</em> o{" "}
                <em>SKU</em> directo.
              </small>
            </div>

            <div>
              <label className="form-label">Valor a imprimir</label>
              <select
                className="form-select"
                value={prioridadValor}
                onChange={(e) => setPrioridadValor(e.target.value)}
              >
                <option value="barcodeFirst">Barcode → SKU → ID</option>
                <option value="skuFirst">SKU → Barcode → ID</option>
              </select>
            </div>
          </div>

          {loading && <p className="text-muted mt-3">Buscando…</p>}

          {/* Lista de resultados */}
          {!loading && resultados.length > 0 && (
            <ul className="list-group mt-3">
              {resultados.map((p) => (
                <li
                  key={p.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <strong>{p.nombre}</strong>
                    {p.categoria && (
                      <span className="ms-2 badge bg-light text-dark">
                        {p.categoria}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleSelectProducto(p.id)}
                  >
                    Ver variantes
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading &&
            resultados.length === 0 &&
            busqueda.trim().length >= 2 && (
              <p className="text-muted mt-3">Sin resultados.</p>
            )}
        </div>

        {/* Variantes del producto seleccionado */}
        <div className="col-md-6">
          <div className="d-flex justify-content-between align-items-center">
            <h5>Variantes del producto</h5>
            {selecciones.length > 0 && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={limpiarSelecciones}
              >
                Limpiar etiquetas
              </button>
            )}
          </div>

          {loadingDetalle && <p className="text-muted">Cargando variantes…</p>}

          {!loadingDetalle && productoSel && (
            <div className="mt-2">
              <div className="mb-2">
                <strong>{productoSel.nombre}</strong>
                {productoSel.categoria && (
                  <span className="ms-2 badge bg-light text-dark">
                    {productoSel.categoria}
                  </span>
                )}
              </div>

              {(productoSel.variantes || []).length === 0 ? (
                <p className="text-muted">Este producto no tiene variantes.</p>
              ) : (
                <ul className="list-group">
                  {productoSel.variantes.map((v) => (
                    <li
                      key={v.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-semibold">
                          <code>{v.sku || "—SKU—"}</code>{" "}
                          <span className="text-muted">({v.id})</span>
                        </div>
                        <div className="small text-muted">
                          {variantLabel(v) || "—"}
                        </div>
                        {v.barcode && (
                          <small className="text-success">
                            [barcode: {v.barcode}]
                          </small>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => agregarVariante(productoSel, v)}
                      >
                        Agregar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!productoSel && (
            <p className="text-muted mt-2">
              Selecciona un producto de los resultados para ver sus variantes, o
              escanéa un código y presiona Enter.
            </p>
          )}
        </div>
      </div>

      {/* Selecciones actuales */}
      <div className="mt-4">
        <h5>Etiquetas a imprimir</h5>
        {selecciones.length === 0 ? (
          <p className="text-muted">No hay variantes seleccionadas.</p>
        ) : (
          <ul className="list-group">
            {selecciones.map((s) => (
              <li
                key={s.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div className="me-3">
                  <div className="fw-semibold">{s.nombreProducto}</div>
                  <div className="small text-muted">
                    {s.atributosTxt || "—"}
                  </div>
                  <div>
                    <span className="badge bg-secondary me-2">
                      {s.sku || s.varianteId}
                    </span>
                    <span className="badge bg-light text-dark">
                      #{s.barcode || "—"}
                    </span>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={s.cantidad}
                    onChange={(e) =>
                      actualizarCantidad(s.id, Number(e.target.value))
                    }
                    min={1}
                    style={{ width: "90px" }}
                  />
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => eliminarVariante(s.id)}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Previsualización y acciones */}
      {selecciones.length > 0 && (
        <div className="mt-4">
          <h4>Previsualización</h4>
          <div className="d-flex flex-wrap gap-4">
            {selecciones.map((s) =>
              Array.from({ length: s.cantidad }).map((_, idx) => {
                const value =
                  prioridadValor === "barcodeFirst"
                    ? toStr(s.barcode || s.sku || s.varianteId)
                    : toStr(s.sku || s.barcode || s.varianteId);
                return (
                  <div key={`${s.id}-${idx}`} className="text-center">
                    <Barcode
                      value={value}
                      format="CODE128"
                      width={2}
                      height={80}
                      fontSize={14}
                      displayValue={false}
                    />
                    <div style={{ fontSize: "0.8rem" }}>
                      <div className="fw-semibold">{s.sku || s.varianteId}</div>
                      <div className="text-muted">{s.atributosTxt}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 d-flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() =>
                imprimirPDF({
                  page: "a4",
                  cols: 4,
                  labelW: 48,
                  labelH: 30,
                  showSku: true,
                  showProducto: false,
                  showAtributos: true,
                  showPrecio: false,
                })
              }
            >
              Imprimir etiquetas (PDF)
            </button>

            <button
              className="btn btn-outline-primary"
              onClick={() =>
                imprimirPDF({
                  page: "letter",
                  cols: 3,
                  labelW: 66.6,
                  labelH: 25.4,
                  marginL: 5,
                  marginT: 10,
                  gapX: 2,
                  gapY: 2,
                  showSku: true,
                  showProducto: false,
                  showAtributos: false,
                })
              }
            >
              PDF (Carta / 3 col)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
