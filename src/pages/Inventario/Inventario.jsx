import React, { useState, useEffect, useCallback } from "react";
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
import AjusteStockModal from "./AjusteStockModal";
import TransferenciaModal from "./TransferenciaModal";
import MovimientosModal from "./MovimientosModal";
import DistribucionModal from "./DistribucionModal";
import AgregarProductoModal from "./AgregarProductoModal";
import "./Inventario.scss";

export default function Inventario() {
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [inventario, setInventario] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);

  // Filtros
  const [vistaActual, setVistaActual] = useState("global");
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [filtroStock, setFiltroStock] = useState("all");
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
    cargarInventario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vistaActual,
    tiendaSeleccionada,
    categoriaSeleccionada,
    filtroStock,
    busqueda,
    currentPage,
    perPage,
  ]);

  const cargarTiendas = async () => {
    try {
      const response = await TiendaService.obtenerTiendas({ activa: true });
      setTiendas(response || []);
    } catch (error) {
      console.error("Error al cargar tiendas:", error);
      toast.error("Error al cargar tiendas");
    }
  };

  const cargarCategorias = async () => {
    try {
      const response = await CategoriaService.obtenerCategorias();
      setCategorias(response || []);
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

  const cargarInventario = useCallback(async () => {
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
  }, [
    currentPage,
    perPage,
    busqueda,
    categoriaSeleccionada,
    filtroStock,
    vistaActual,
    tiendaSeleccionada,
  ]);

  const handlePageChange = (page) => {
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

  const abrirModalMovimientos = (varianteId = null) => {
    setContentModal(<MovimientosModal varianteId={varianteId} />);
    setModalTitle("Historial de Movimientos");
    setModalSize("xl");
    setShowModal(true);
  };

  const abrirModalDistribucion = (item) => {
    setContentModal(<DistribucionModal item={item} />);
    setModalTitle("Distribución por Tiendas");
    setModalSize("lg");
    setShowModal(true);
  };

  const abrirModalAgregarProducto = () => {
    const tiendaNombre =
      tiendas.find((t) => t.id === tiendaSeleccionada)?.nombre || "Tienda";
    setContentModal(
      <AgregarProductoModal
        tiendaId={tiendaSeleccionada}
        tiendaNombre={tiendaNombre}
        onSuccess={() => {
          cargarInventario();
          cargarEstadisticas();
          setShowModal(false);
        }}
      />
    );
    setModalTitle("Agregar Producto al Inventario");
    setModalSize("lg");
    setShowModal(true);
  };

  // Columnas para Vista Global (solo lectura + distribución)
  const columnasGlobal = [
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
      name: "Stock Total",
      selector: (row) => row.cantidad_disponible || 0,
      sortable: true,
      width: "140px",
      cell: (row) => {
        const stock = row.cantidad_disponible || 0;
        const minimo = row.minimo_stock || 0;
        const tiendas = row.cantidad_tiendas || 1;
        const className =
          stock === 0
            ? "stock-badge sin-stock"
            : stock < minimo
            ? "stock-badge bajo-minimo"
            : "stock-badge normal";

        return (
          <div>
            <span className={className}>{stock}</span>
            <br />
            <small className="text-muted">en {tiendas} tienda(s)</small>
          </div>
        );
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
      width: "140px",
      cell: (row) => (
        <div className="action-buttons">
          <button
            className="btn-icon btn-info"
            onClick={() => abrirModalDistribucion(row)}
            title="Ver distribución por tiendas"
          >
            <FontAwesomeIcon icon={faWarehouse} />
          </button>
          <button
            className="btn-icon btn-secondary"
            onClick={() => abrirModalMovimientos(row.variante_id)}
            title="Ver movimientos"
          >
            <FontAwesomeIcon icon={faHistory} />
          </button>
        </div>
      ),
    },
  ];

  // Columnas para Vista por Tienda (operativa con ajustes)
  const columnasTienda = [
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
            className="btn-icon btn-primary"
            onClick={() => abrirModalAjuste(row)}
            title="Ajustar stock"
          >
            <FontAwesomeIcon icon={faEdit} />
          </button>
          <button
            className="btn-icon btn-secondary"
            onClick={() => abrirModalMovimientos(row.variante_id)}
            title="Ver movimientos"
          >
            <FontAwesomeIcon icon={faHistory} />
          </button>
        </div>
      ),
    },
  ];

  // Seleccionar columnas según la vista
  const columns = vistaActual === "global" ? columnasGlobal : columnasTienda;

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
              <div className="stat-value">
                {estadisticas.total_variantes || 0}
              </div>
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
              <div className="stat-value">
                {estadisticas.variantes_bajo_minimo || 0}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Sin Stock</div>
              <div className="stat-value">
                {estadisticas.variantes_sin_stock || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel de control */}
      <div className="inventario-container">
        <div className="inventario-header">
          <h1>
            <FontAwesomeIcon icon={faBoxes} />{" "}
            {vistaActual === "global"
              ? "Inventario Global"
              : tiendaSeleccionada
              ? `Inventario - ${
                  tiendas.find((t) => t.id === tiendaSeleccionada)?.nombre ||
                  "Tienda"
                }`
              : "Inventario por Tienda"}
          </h1>
          <div className="header-actions">
            {vistaActual === "tienda" && tiendaSeleccionada && (
              <button
                className="btn btn-success"
                onClick={abrirModalAgregarProducto}
              >
                <FontAwesomeIcon icon={faBoxes} /> Agregar Producto
              </button>
            )}
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
              className={`vista-btn ${
                vistaActual === "global" ? "active" : ""
              }`}
              onClick={() => {
                setVistaActual("global");
                setTiendaSeleccionada("");
              }}
            >
              <FontAwesomeIcon icon={faWarehouse} /> Inventario Global
            </button>
            <button
              className={`vista-btn ${
                vistaActual === "tienda" ? "active" : ""
              }`}
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
