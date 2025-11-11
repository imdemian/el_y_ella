import React, { useState, useEffect } from "react";
import { InventarioService } from "../../services/supabase/inventarioService";
import { TiendaService } from "../../services/supabase/tiendaService";
import { CategoriaService } from "../../services/supabase/categoriaService";
import DataTable from "react-data-table-component";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxes,
  faSearch,
  faStore,
  faWarehouse,
  faExclamationTriangle,
  faExchangeAlt,
  faEdit,
  faHistory,
  faSpinner,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import BasicModal from "../../components/BasicModal/BasicModal";
import "./Inventario.scss";

function Inventario() {
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [inventario, setInventario] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);

  // Filtros
  const [vistaActual, setVistaActual] = useState("global"); // 'global' o 'tienda'
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [filtroStock, setFiltroStock] = useState("all"); // 'all', 'bajo_minimo', 'sin_stock'
  const [busqueda, setBusqueda] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [modalSize, setModalSize] = useState("md");

  // Cargar datos iniciales
  useEffect(() => {
    cargarTiendas();
    cargarCategorias();
    cargarEstadisticas();
  }, []);

  // Cargar inventario cuando cambian los filtros
  useEffect(() => {
    const cargarInventario = async () => {
      setLoading(true);
      try {
        const filtros = {
          page: currentPage,
          limit: perPage,
          search: busqueda || undefined,
          categoria_id: categoriaSeleccionada || undefined,
          bajo_minimo: filtroStock === "bajo_minimo" ? true : undefined,
          sin_stock: filtroStock === "sin_stock" ? true : undefined,
        };

        let response;
        if (vistaActual === "global") {
          response = await InventarioService.obtenerInventarioGlobal(filtros);
        } else if (tiendaSeleccionada) {
          response = await InventarioService.obtenerInventarioDeTienda(
            tiendaSeleccionada,
            filtros
          );
        } else {
          setInventario([]);
          setLoading(false);
          return;
        }

        setInventario(response.data || []);
        setTotalRows(response.pagination?.total_items || 0);
      } catch (error) {
        console.error("Error al cargar inventario:", error);
        toast.error("Error al cargar inventario");
        setInventario([]);
      } finally {
        setLoading(false);
      }
    };

    cargarInventario();
  }, [vistaActual, tiendaSeleccionada, categoriaSeleccionada, filtroStock, busqueda, currentPage, perPage]);

  const cargarTiendas = async () => {
    try {
      const response = await TiendaService.listarTiendas({ activo: true });
      setTiendas(response.data || []);
    } catch (error) {
      console.error("Error al cargar tiendas:", error);
      toast.error("Error al cargar tiendas");
    }
  };

  const cargarCategorias = async () => {
    try {
      const response = await CategoriaService.listarCategorias({ activo: true });
      setCategorias(response.data || []);
    } catch (err) {
      console.error("Error al cargar categorías:", err);
      toast.error("Error al cargar categorías");
    }
  };

    const cargarEstadisticas = async () => {
    try {
      const stats = await InventarioService.obtenerEstadisticas();
      setEstadisticas(stats);
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const cargarInventario = async () => {
    setLoading(true);
    try {
      const filtros = {
        page: currentPage,
        limit: perPage,
        search: busqueda || undefined,
        categoria_id: categoriaSeleccionada || undefined,
        bajo_minimo: filtroStock === "bajo_minimo" ? true : undefined,
        sin_stock: filtroStock === "sin_stock" ? true : undefined,
      };

      let response;
      if (vistaActual === "global") {
        response = await InventarioService.obtenerInventarioGlobal(filtros);
      } else if (tiendaSeleccionada) {
        response = await InventarioService.obtenerInventarioDeTienda(
          tiendaSeleccionada,
          filtros
        );
      } else {
        setInventario([]);
        setLoading(false);
        return;
      }

      setInventario(response.data || []);
      setTotalRows(response.pagination?.total_items || 0);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
      toast.error("Error al cargar inventario");
      setInventario([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar inventario cuando cambian los filtros
  useEffect(() => {
    cargarInventario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaActual, tiendaSeleccionada, categoriaSeleccionada, filtroStock, busqueda, currentPage, perPage]);

  // Cargar inventario cuando cambian los filtros
  useEffect(() => {  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePerRowsChange = (newPerPage, page) => {
    setPerPage(newPerPage);
    setCurrentPage(page);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoriaSeleccionada("");
    setFiltroStock("all");
    setCurrentPage(1);
  };

  // Abrir modal de ajuste de stock
  const abrirModalAjuste = (item) => {
    setContentModal(
      <AjusteStockModal
        item={item}
        vistaActual={vistaActual}
        tiendaSeleccionada={tiendaSeleccionada}
        onSuccess={() => {
          cargarInventario();
          cargarEstadisticas();
          setShowModal(false);
        }}
      />
    );
    setModalTitle("Ajustar Stock");
    setModalSize("md");
    setShowModal(true);
  };

  // Abrir modal de transferencia
  const abrirModalTransferencia = () => {
    setContentModal(
      <TransferenciaModal
        tiendas={tiendas}
        onSuccess={() => {
          cargarInventario();
          cargarEstadisticas();
          setShowModal(false);
        }}
      />
    );
    setModalTitle("Transferir Inventario");
    setModalSize("lg");
    setShowModal(true);
  };

  // Abrir modal de movimientos
  const abrirModalMovimientos = (varianteId = null) => {
    setContentModal(
      <MovimientosModal varianteId={varianteId} />
    );
    setModalTitle("Historial de Movimientos");
    setModalSize("xl");
    setShowModal(true);
  };

  // Columnas de la tabla
  const columns = [
    {
      name: "SKU",
      selector: (row) => row.variantes_producto?.sku || "N/A",
      sortable: true,
      width: "120px",
    },
    {
      name: "Producto",
      selector: (row) => row.variantes_producto?.productos?.nombre || "N/A",
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div>
          <div className="producto-nombre">
            {row.variantes_producto?.productos?.nombre || "N/A"}
          </div>
          <div className="producto-atributos">
            {row.variantes_producto?.atributos
              ? Object.entries(row.variantes_producto.atributos)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(", ")
              : "Sin variantes"}
          </div>
        </div>
      ),
    },
    {
      name: "Categoría",
      selector: (row) =>
        row.variantes_producto?.productos?.categorias?.nombre || "N/A",
      sortable: true,
      width: "150px",
    },
    {
      name: "Stock Disponible",
      selector: (row) => row.cantidad_disponible || 0,
      sortable: true,
      width: "140px",
      cell: (row) => {
        const stock = row.cantidad_disponible || 0;
        const minimo = row.minimo_stock || 0;
        const className =
          stock === 0
            ? "stock-badge sin-stock"
            : stock < minimo
            ? "stock-badge bajo-minimo"
            : "stock-badge normal";

        return <span className={className}>{stock}</span>;
      },
    },
    {
      name: "Stock Mínimo",
      selector: (row) => row.minimo_stock || 0,
      sortable: true,
      width: "130px",
    },
    {
      name: "Precio",
      selector: (row) => row.variantes_producto?.precio || 0,
      sortable: true,
      width: "100px",
      cell: (row) => `$${(row.variantes_producto?.precio || 0).toFixed(2)}`,
    },
    {
      name: "Acciones",
      width: "120px",
      cell: (row) => (
        <div className="action-buttons">
          <button
            className="btn-icon"
            onClick={() => abrirModalAjuste(row)}
            title="Ajustar stock"
          >
            <FontAwesomeIcon icon={faEdit} />
          </button>
          <button
            className="btn-icon"
            onClick={() => abrirModalMovimientos(row.variante_id)}
            title="Ver movimientos"
          >
            <FontAwesomeIcon icon={faHistory} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="inventario-page">
      {/* Estadísticas */}
      {estadisticas && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faBoxes} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Variantes</div>
              <div className="stat-value">{estadisticas.total_variantes || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <FontAwesomeIcon icon={faWarehouse} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Stock Total</div>
              <div className="stat-value">{estadisticas.stock_total || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Bajo Mínimo</div>
              <div className="stat-value">{estadisticas.variantes_bajo_minimo || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Sin Stock</div>
              <div className="stat-value">{estadisticas.variantes_sin_stock || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Panel de control */}
      <div className="inventario-container">
        <div className="inventario-header">
          <h1>
            <FontAwesomeIcon icon={faBoxes} /> Gestión de Inventario
          </h1>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={abrirModalTransferencia}
            >
              <FontAwesomeIcon icon={faExchangeAlt} /> Transferir
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => abrirModalMovimientos()}
            >
              <FontAwesomeIcon icon={faHistory} /> Movimientos
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="filtros-panel">
          {/* Vista selector */}
          <div className="vista-selector">
            <button
              className={`vista-btn ${vistaActual === "global" ? "active" : ""}`}
              onClick={() => {
                setVistaActual("global");
                setTiendaSeleccionada("");
              }}
            >
              <FontAwesomeIcon icon={faWarehouse} /> Inventario Global
            </button>
            <button
              className={`vista-btn ${vistaActual === "tienda" ? "active" : ""}`}
              onClick={() => setVistaActual("tienda")}
            >
              <FontAwesomeIcon icon={faStore} /> Por Tienda
            </button>
          </div>

          {/* Filtros de búsqueda */}
          <div className="filtros-row">
            {/* Búsqueda */}
            <div className="filter-group">
              <label>Buscar:</label>
              <div className="search-input-wrapper">
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  placeholder="SKU o nombre del producto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Tienda (solo si vista es 'tienda') */}
            {vistaActual === "tienda" && (
              <div className="filter-group">
                <label>Tienda:</label>
                <select
                  value={tiendaSeleccionada}
                  onChange={(e) => setTiendaSeleccionada(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Seleccionar tienda...</option>
                  {tiendas.map((tienda) => (
                    <option key={tienda.id} value={tienda.id}>
                      {tienda.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Categoría */}
            <div className="filter-group">
              <label>Categoría:</label>
              <select
                value={categoriaSeleccionada}
                onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de stock */}
            <div className="filter-group">
              <label>Estado:</label>
              <select
                value={filtroStock}
                onChange={(e) => setFiltroStock(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos</option>
                <option value="bajo_minimo">Bajo Mínimo</option>
                <option value="sin_stock">Sin Stock</option>
              </select>
            </div>

            <button className="btn btn-outline" onClick={limpiarFiltros}>
              <FontAwesomeIcon icon={faFilter} /> Limpiar
            </button>
          </div>
        </div>

        {/* Tabla de inventario */}
        <div className="inventario-table">
          <DataTable
            columns={columns}
            data={inventario}
            progressPending={loading}
            progressComponent={
              <div className="loading-spinner">
                <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                <p>Cargando inventario...</p>
              </div>
            }
            pagination
            paginationServer
            paginationTotalRows={totalRows}
            onChangePage={handlePageChange}
            onChangeRowsPerPage={handlePerRowsChange}
            paginationPerPage={perPage}
            paginationRowsPerPageOptions={[10, 25, 50, 100]}
            noDataComponent={
              <div className="no-data">
                <FontAwesomeIcon icon={faBoxes} size="3x" />
                <p>
                  {vistaActual === "tienda" && !tiendaSeleccionada
                    ? "Selecciona una tienda para ver su inventario"
                    : "No hay productos en el inventario"}
                </p>
              </div>
            }
            customStyles={{
              headRow: {
                style: {
                  backgroundColor: "#9b7fa8",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "600",
                },
              },
              rows: {
                style: {
                  fontSize: "13px",
                  "&:hover": {
                    backgroundColor: "#f8f9fa",
                    cursor: "pointer",
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Modal */}
      <BasicModal
        show={showModal}
        setShow={setShowModal}
        title={modalTitle}
        size={modalSize}
      >
        {contentModal}
      </BasicModal>
    </div>
  );
}

// ============= COMPONENTES AUXILIARES =============

// Componente para ajustar stock
function AjusteStockModal({ item, vistaActual, tiendaSeleccionada, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [nuevoMinimo, setNuevoMinimo] = useState(item.minimo_stock || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Registrar movimiento
      if (cantidad && parseInt(cantidad) > 0) {
        await InventarioService.registrarMovimiento({
          variante_id: item.variante_id,
          tipo_movimiento: tipoMovimiento,
          cantidad: parseInt(cantidad),
          motivo: motivo || undefined,
          tienda_id: vistaActual === "tienda" ? parseInt(tiendaSeleccionada) : undefined,
        });
      }

      // Actualizar mínimo si cambió
      if (nuevoMinimo !== item.minimo_stock) {
        if (vistaActual === "global") {
          await InventarioService.actualizarInventarioGlobal(item.variante_id, {
            minimo_stock: parseInt(nuevoMinimo),
          });
        }
      }

      toast.success("Stock actualizado correctamente");
      onSuccess();
    } catch (error) {
      console.error("Error al actualizar stock:", error);
      toast.error(error.message || "Error al actualizar stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ajuste-stock-form">
      <div className="producto-info">
        <h4>{item.variantes_producto?.productos?.nombre}</h4>
        <p>SKU: {item.variantes_producto?.sku}</p>
        <p className="stock-actual">
          Stock actual: <strong>{item.cantidad_disponible || 0}</strong>
        </p>
      </div>

      <div className="form-group">
        <label>Tipo de Movimiento:</label>
        <select
          value={tipoMovimiento}
          onChange={(e) => setTipoMovimiento(e.target.value)}
          className="form-control"
        >
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
          <option value="ajuste">Ajuste</option>
        </select>
      </div>

      <div className="form-group">
        <label>Cantidad:</label>
        <input
          type="number"
          min="0"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="form-control"
          placeholder="0"
        />
      </div>

      <div className="form-group">
        <label>Motivo:</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="form-control"
          rows="3"
          placeholder="Motivo del ajuste (opcional)"
        />
      </div>

      {vistaActual === "global" && (
        <div className="form-group">
          <label>Stock Mínimo:</label>
          <input
            type="number"
            min="0"
            value={nuevoMinimo}
            onChange={(e) => setNuevoMinimo(e.target.value)}
            className="form-control"
          />
        </div>
      )}

      <div className="modal-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </div>
    </form>
  );
}

/* ============= COMPONENTE: TRANSFERENCIA ============= */
function TransferenciaModal({ tiendas, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);
  const [tiendaOrigen, setTiendaOrigen] = useState("");
  const [tiendaDestino, setTiendaDestino] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");

  const buscarProducto = async () => {
    if (!busquedaProducto.trim()) return;

    try {
      const resultado = await InventarioService.buscarVariantePorSKU(busquedaProducto);
      if (resultado) {
        setVarianteSeleccionada(resultado);
        toast.success("Producto encontrado");
      } else {
        toast.error("Producto no encontrado");
      }
    } catch (error) {
      toast.error("Error al buscar producto");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!varianteSeleccionada) {
      toast.error("Debe seleccionar un producto");
      return;
    }

    setLoading(true);
    try {
      await InventarioService.transferirInventario({
        variante_id: varianteSeleccionada.variante_id,
        tienda_origen_id: parseInt(tiendaOrigen),
        tienda_destino_id: parseInt(tiendaDestino),
        cantidad: parseInt(cantidad),
        motivo: motivo || undefined,
      });

      toast.success("Transferencia realizada correctamente");
      onSuccess();
    } catch (error) {
      console.error("Error en transferencia:", error);
      toast.error(error.message || "Error al transferir inventario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transferencia-form">
      <div className="form-group">
        <label>Buscar Producto (SKU):</label>
        <div className="search-product">
          <input
            type="text"
            value={busquedaProducto}
            onChange={(e) => setBusquedaProducto(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), buscarProducto())}
            className="form-control"
            placeholder="Ingrese SKU"
          />
          <button type="button" onClick={buscarProducto} className="btn btn-secondary">
            <FontAwesomeIcon icon={faSearch} />
          </button>
        </div>
      </div>

      {varianteSeleccionada && (
        <div className="producto-seleccionado">
          <h4>{varianteSeleccionada.variantes_producto?.productos?.nombre}</h4>
          <p>SKU: {varianteSeleccionada.variantes_producto?.sku}</p>
          <p>Stock disponible: {varianteSeleccionada.cantidad_disponible}</p>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Tienda Origen:</label>
          <select
            value={tiendaOrigen}
            onChange={(e) => setTiendaOrigen(e.target.value)}
            className="form-control"
            required
          >
            <option value="">Seleccionar...</option>
            {tiendas.map((tienda) => (
              <option key={tienda.id} value={tienda.id}>
                {tienda.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tienda Destino:</label>
          <select
            value={tiendaDestino}
            onChange={(e) => setTiendaDestino(e.target.value)}
            className="form-control"
            required
          >
            <option value="">Seleccionar...</option>
            {tiendas
              .filter((t) => t.id !== parseInt(tiendaOrigen))
              .map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Cantidad a Transferir:</label>
        <input
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="form-control"
          required
        />
      </div>

      <div className="form-group">
        <label>Motivo:</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="form-control"
          rows="3"
          placeholder="Motivo de la transferencia"
        />
      </div>

      <div className="modal-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Transfiriendo...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faExchangeAlt} /> Transferir
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ============= COMPONENTE: HISTORIAL DE MOVIMIENTOS ============= */
function MovimientosModal({ varianteId }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    const cargarMovimientos = async () => {
      setLoading(true);
      try {
        const filtros = {
          limit: 100,
          variante_id: varianteId || undefined,
          tipo_movimiento: filtroTipo || undefined,
        };

        const response = await InventarioService.obtenerMovimientos(filtros);
        setMovimientos(response.data || []);
      } catch (error) {
        console.error("Error al cargar movimientos:", error);
        toast.error("Error al cargar movimientos");
      } finally {
        setLoading(false);
      }
    };

    cargarMovimientos();
  }, [varianteId, filtroTipo]);

  const tiposMovimiento = [
    { value: "", label: "Todos" },
    { value: "entrada", label: "Entrada" },
    { value: "salida", label: "Salida" },
    { value: "transferencia", label: "Transferencia" },
    { value: "ajuste", label: "Ajuste" },
    { value: "reserva", label: "Reserva" },
    { value: "liberacion", label: "Liberación" },
  ];

  const getTipoClass = (tipo) => {
    const clases = {
      entrada: "tipo-entrada",
      salida: "tipo-salida",
      transferencia: "tipo-transferencia",
      ajuste: "tipo-ajuste",
      reserva: "tipo-reserva",
      liberacion: "tipo-liberacion",
    };
    return clases[tipo] || "";
  };

  return (
    <div className="movimientos-container">
      <div className="movimientos-filtros">
        <label>Tipo de Movimiento:</label>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="form-control"
        >
          {tiposMovimiento.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        </div>
      ) : (
        <div className="movimientos-lista">
          {movimientos.length === 0 ? (
            <div className="no-data">No hay movimientos registrados</div>
          ) : (
            movimientos.map((mov) => (
              <div key={mov.id} className="movimiento-item">
                <div className="movimiento-header">
                  <span className={`tipo-badge ${getTipoClass(mov.tipo_movimiento)}`}>
                    {mov.tipo_movimiento}
                  </span>
                  <span className="cantidad">
                    {mov.tipo_movimiento === "salida" ? "-" : "+"}
                    {mov.cantidad}
                  </span>
                </div>
                <div className="movimiento-body">
                  <div className="producto-info">
                    <strong>{mov.variantes_producto?.productos?.nombre}</strong>
                    <span className="sku">SKU: {mov.variantes_producto?.sku}</span>
                  </div>
                  {mov.tiendas && (
                    <div className="tienda-info">
                      <FontAwesomeIcon icon={faStore} /> {mov.tiendas.nombre}
                    </div>
                  )}
                  {mov.motivo && <div className="motivo">{mov.motivo}</div>}
                  <div className="movimiento-footer">
                    <span className="usuario">
                      {mov.usuarios?.nombre || "Sistema"}
                    </span>
                    <span className="fecha">
                      {new Date(mov.created_at).toLocaleString("es-MX")}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Inventario;
