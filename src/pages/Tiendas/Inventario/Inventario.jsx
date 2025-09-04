import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  obtenerInventarioTienda,
  agregarInventarioTienda,
  actualizarInventarioTienda,
  obtenerLogsInventarioTienda,
} from "../../../services/tiendaService";
import { obtenerProductosPaginado } from "../../../services/productoService";
import { obtenerCategorias } from "../../../services/categoriaService";
import { toast } from "react-toastify";

export default function Inventario() {
  const cargadoRef = useRef(false);
  const { tiendaId } = useParams();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [lastProductoId, setLastProductoId] = useState(null);
  const [hasMoreProductos, setHasMoreProductos] = useState(true);

  const [inventario, setInventario] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedProd, setSelectedProd] = useState(null);
  const [valoresInventario, setValoresInventario] = useState({});

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroTalla, setFiltroTalla] = useState("");
  const [filtroColor, setFiltroColor] = useState("");

  const [loadingProds, setLoadingProds] = useState(false);
  const [loadingInv, setLoadingInv] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const PRODUCTOS_PAGINA = 20;

  // Helpers
  const toStr = (v) => (v == null ? "" : String(v));
  const getAttr = (variant, key) => {
    if (!variant) return "";
    const direct = variant[key];
    const fromAttrs =
      variant.atributos &&
      (variant.atributos[key] ??
        variant.atributos[key?.charAt(0).toUpperCase() + key?.slice(1)]);
    return toStr(fromAttrs ?? direct ?? "");
  };

  const cargarProductos = async () => {
    if (loadingProds || !hasMoreProductos) return;
    setLoadingProds(true);
    try {
      const nuevos = await obtenerProductosPaginado(
        PRODUCTOS_PAGINA,
        lastProductoId
      );
      if (!nuevos || !Array.isArray(nuevos.productos)) {
        throw new Error("Respuesta inesperada: productos no es un array");
      }
      if (nuevos.productos.length < PRODUCTOS_PAGINA)
        setHasMoreProductos(false);
      if (nuevos.productos.length > 0) {
        setLastProductoId(nuevos.productos[nuevos.productos.length - 1].id);
        setProductos((prev) => [...prev, ...nuevos.productos]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error cargando productos");
    } finally {
      setLoadingProds(false);
    }
  };

  // Carga inicial de productos (paginado) una sola vez
  useEffect(() => {
    if (cargadoRef.current) return;
    cargadoRef.current = true;
    cargarProductos();
  }, []); // eslint-disable-line

  // Cargar categorías sólo una vez
  useEffect(() => {
    (async () => {
      try {
        const resCategorias = await obtenerCategorias();
        setCategorias(Array.isArray(resCategorias) ? resCategorias : []);
      } catch (err) {
        console.error(err);
        toast.error("Error cargando categorías");
      }
    })();
  }, []);

  const handleProdChange = async (e) => {
    const prodId = e.target.value;
    const prod = productos.find((p) => p.id === prodId) || null;
    setSelectedProd(prod);
    setValoresInventario({});
    setInventario([]);
    setLogs([]);

    if (!prod) return;

    setLoadingInv(true);
    try {
      const inv = await obtenerInventarioTienda(tiendaId, prod.id);
      setInventario(Array.isArray(inv) ? inv : []);

      // prellenar por variante
      const nuevosValores = {};
      (prod.variantes || []).forEach((v) => {
        const invRec = inv.find((i) => i.varianteId === v.id);
        nuevosValores[v.id] = {
          stock: invRec?.stock || 0,
          minimo: invRec?.minimoStock || 0,
          inventarioId: invRec?.id || null,
        };
      });
      setValoresInventario(nuevosValores);

      const hist = await obtenerLogsInventarioTienda(tiendaId);
      setLogs(Array.isArray(hist) ? hist : []);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando inventario del producto");
    } finally {
      setLoadingInv(false);
    }
  };

  const handleGuardarVariante = async (varianteId) => {
    if (!selectedProd) return;
    const valores = valoresInventario[varianteId];
    const v = (selectedProd.variantes || []).find((vx) => vx.id === varianteId);
    if (!v || !valores) return;

    const existente = valores.inventarioId;
    if ((valores.stock ?? 0) < 0 || (valores.minimo ?? 0) < 0) {
      toast.error("Los valores no pueden ser negativos");
      return;
    }

    if (existente) {
      await actualizarInventarioTienda(tiendaId, existente, {
        stock: valores.stock,
        minimoStock: valores.minimo,
      });
    } else {
      await agregarInventarioTienda(tiendaId, {
        productoId: selectedProd.id,
        varianteId: v.id,
        cantidad: valores.stock,
        minimoStock: valores.minimo,
      });
    }
  };

  const handleGuardarTodo = async () => {
    if (!selectedProd) return;
    const variantesConDatos = (selectedProd.variantes || []).filter((v) => {
      const val = valoresInventario[v.id];
      return (
        val &&
        (Number(val.stock) > 0 || Number(val.minimo) > 0 || val.inventarioId)
      );
    });

    if (variantesConDatos.length === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }

    setSavingAll(true);
    try {
      const ops = variantesConDatos.map((v) => handleGuardarVariante(v.id));
      const res = await Promise.allSettled(ops);
      const ok = res.filter((r) => r.status === "fulfilled").length;
      const fail = res.length - ok;

      // refrescar inventario del producto seleccionado
      await handleProdChange({ target: { value: selectedProd.id } });

      if (fail === 0) {
        toast.success(`Se guardaron ${ok} variantes correctamente`);
      } else {
        toast.warn(`OK: ${ok}, Fallas: ${fail}. Revisa la consola/logs.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar el inventario");
    } finally {
      setSavingAll(false);
    }
  };

  // Filtro avanzado (memo para evitar recomputar)
  const productosFiltrados = useMemo(() => {
    const texto = toStr(filtroTexto).toLowerCase();
    const cat = toStr(filtroCategoria).toLowerCase();
    const tallaF = toStr(filtroTalla).toLowerCase();
    const colorF = toStr(filtroColor).toLowerCase();

    return productos.filter((p) => {
      const nombreOk = toStr(p.nombre).toLowerCase().includes(texto);
      const idOk = toStr(p.id).toLowerCase().includes(texto);
      const varianteIdOk = (p.variantes || []).some((v) =>
        toStr(v.id).toLowerCase().includes(texto)
      );

      const coincideCategoria =
        !cat ||
        (p.categoria && toStr(p.categoria).toLowerCase().includes(cat)) ||
        (p.categoriaNombre &&
          toStr(p.categoriaNombre).toLowerCase().includes(cat));

      const coincideTalla =
        !tallaF ||
        (p.variantes || []).some((v) =>
          getAttr(v, "talla").toLowerCase().includes(tallaF)
        );

      const coincideColor =
        !colorF ||
        (p.variantes || []).some((v) =>
          getAttr(v, "color").toLowerCase().includes(colorF)
        );

      // dentro de useMemo de productosFiltrados, después de las const texto/cat/tallaF/colorF:
      const coincideSku = (p) =>
        (p.variantes || []).some((v) =>
          (v.sku || "").toLowerCase().includes(texto)
        );

      const coincideBarcode = (p) =>
        (p.variantes || []).some((v) =>
          (v.barcode || "").toLowerCase().includes(texto)
        );

      // y en coincideTexto, añade estas dos condiciones:
      const coincideTexto =
        !texto ||
        nombreOk ||
        idOk ||
        varianteIdOk ||
        coincideSku(p) ||
        coincideBarcode(p);

      return (
        coincideTexto && coincideCategoria && coincideTalla && coincideColor
      );
    });
  }, [productos, filtroTexto, filtroCategoria, filtroTalla, filtroColor]);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Inventario — Tienda: {tiendaId}</h2>
        <Link to="/tiendas" className="btn btn-secondary">
          ← Volver a Tiendas
        </Link>
      </div>

      <div className="card p-3 mb-4">
        <h5>Filtros de búsqueda</h5>
        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Nombre, ID producto o variante"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              name="categoria"
              id="categoria"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="">— Selecciona categoría —</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.nombre}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Talla"
              value={filtroTalla}
              onChange={(e) => setFiltroTalla(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Color"
              value={filtroColor}
              onChange={(e) => setFiltroColor(e.target.value)}
            />
          </div>
        </div>

        <h5>Seleccionar Producto</h5>
        <div className="row g-3 align-items-end">
          <div className="col-md-6">
            <label className="form-label">Producto</label>
            <select
              className="form-select"
              onChange={handleProdChange}
              value={selectedProd?.id || ""}
              disabled={loadingProds}
            >
              <option value="">— Selecciona —</option>
              {productosFiltrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <div className="mt-2 d-flex gap-2">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={cargarProductos}
                disabled={loadingProds || !hasMoreProductos}
              >
                {loadingProds
                  ? "Cargando..."
                  : hasMoreProductos
                  ? "Cargar más productos"
                  : "No hay más"}
              </button>
              {selectedProd && (
                <span className="text-muted small">
                  {loadingInv ? "Cargando inventario..." : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {selectedProd && (
          <div className="mt-4">
            <h5>Variantes del producto</h5>
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedProd.variantes || []).map((v) => (
                    <tr key={v.id}>
                      <td>{v.sku}</td>
                      <td style={{ maxWidth: 140 }}>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          value={valoresInventario[v.id]?.stock ?? 0}
                          onChange={(e) =>
                            setValoresInventario((prev) => ({
                              ...prev,
                              [v.id]: {
                                ...prev[v.id],
                                stock: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </td>
                      <td style={{ maxWidth: 140 }}>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          value={valoresInventario[v.id]?.minimo ?? 0}
                          onChange={(e) =>
                            setValoresInventario((prev) => ({
                              ...prev,
                              [v.id]: {
                                ...prev[v.id],
                                minimo: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 d-flex justify-content-end">
                <button
                  className="btn btn-success"
                  onClick={handleGuardarTodo}
                  disabled={savingAll || loadingInv}
                >
                  {savingAll ? "Guardando..." : "Guardar todo con datos"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* (Opcional) Logs si quieres mostrarlos aquí
      <div className="mb-4">
        <h5>Historial de Cambios</h5>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          <ul className="list-group">
            {logs.map((log) => (
              <li key={log.id} className="list-group-item small">
                <strong>{new Date(log.timestamp).toLocaleString()}</strong> —{" "}
                {log.tipoOperacion} —{" "}
                {Object.entries(log.cambio)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}
              </li>
            ))}
          </ul>
        </div>
      </div>
      */}
    </div>
  );
}
