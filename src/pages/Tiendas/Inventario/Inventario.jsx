import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  obtenerInventarioTienda,
  agregarInventarioTienda,
  actualizarInventarioTienda,
  obtenerLogsInventarioTienda,
} from "../../../services/tiendaService";
import { obtenerProductosPaginado } from "../../../services/productoService";
import { toast } from "react-toastify";
import { obtenerCategorias } from "../../../services/categoriaService";

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

  const PRODUCTOS_PAGINA = 20;

  const cargarProductos = async () => {
    try {
      const nuevos = await obtenerProductosPaginado(
        PRODUCTOS_PAGINA,
        lastProductoId
      );
      if (!Array.isArray(nuevos.productos))
        throw new Error("Respuesta inesperada: productos no es un array");

      if (nuevos.productos.length < PRODUCTOS_PAGINA)
        setHasMoreProductos(false);
      if (nuevos.productos.length > 0)
        setLastProductoId(nuevos.productos[nuevos.productos.length - 1].id);
      setProductos((prev) => [...prev, ...nuevos.productos]);
      const resCategorias = await obtenerCategorias();
      setCategorias(resCategorias);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando productos");
    }
  };

  useEffect(() => {
    if (cargadoRef.current) return;
    cargadoRef.current = true;
    cargarProductos();
  }, []);

  const handleProdChange = async (e) => {
    const prod = productos.find((p) => p.id === e.target.value) || null;
    setSelectedProd(prod);
    if (!prod) return;

    try {
      const inv = await obtenerInventarioTienda(tiendaId, prod.id);
      setInventario(inv);

      const nuevosValores = {};
      prod.variantes.forEach((v) => {
        const invRec = inv.find((i) => i.varianteId === v.id);
        nuevosValores[v.id] = {
          stock: invRec?.stock || 0,
          minimo: invRec?.minimoStock || 0,
          inventarioId: invRec?.id || null,
        };
      });
      setValoresInventario(nuevosValores);

      const hist = await obtenerLogsInventarioTienda(tiendaId);
      setLogs(hist);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando inventario del producto");
    }
  };

  const handleGuardarVariante = async (varianteId) => {
    const valores = valoresInventario[varianteId];
    const v = selectedProd.variantes.find((v) => v.id === varianteId);
    const existente = valores.inventarioId;

    try {
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

      handleProdChange({ target: { value: selectedProd.id } });
    } catch (err) {
      console.error(err);
      toast.error("Error guardando inventario");
    }
  };

  const handleGuardarTodo = async () => {
    const variantesConDatos = selectedProd.variantes.filter((v) => {
      const val = valoresInventario[v.id];
      return val && (val.stock > 0 || val.minimo > 0);
    });

    for (const v of variantesConDatos) {
      await handleGuardarVariante(v.id);
    }

    toast.success("Inventario guardado correctamente");
  };

  // Filtro avanzado
  const productosFiltrados = productos.filter((p) => {
    const texto = filtroTexto.toLowerCase();

    const coincideTexto =
      p.id.toLowerCase().includes(texto) ||
      p.variantes?.some((v) => v.id.toLowerCase().includes(texto));

    const coincideCategoria =
      !filtroCategoria ||
      (p.categoria &&
        p.categoria.toLowerCase().includes(filtroCategoria.toLowerCase()));

    const coincideTalla =
      !filtroTalla ||
      p.variantes?.some((v) =>
        v.talla?.toLowerCase().includes(filtroTalla.toLowerCase())
      );

    const coincideColor =
      !filtroColor ||
      p.variantes?.some((v) =>
        v.color?.toLowerCase().includes(filtroColor.toLowerCase())
      );

    return coincideTexto && coincideCategoria && coincideTalla && coincideColor;
  });

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
              placeholder="ID producto o variante"
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
            >
              <option value="">— Selecciona —</option>
              {productosFiltrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {hasMoreProductos && (
              <div className="mt-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={cargarProductos}
                >
                  Cargar más productos
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedProd && (
          <div className="mt-4">
            <h5>Variantes del producto</h5>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProd.variantes.map((v) => (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          value={valoresInventario[v.id]?.stock || 0}
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
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          value={valoresInventario[v.id]?.minimo || 0}
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
                  className="btn btn-success align-self-end"
                  onClick={handleGuardarTodo}
                >
                  Guardar todo con datos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
