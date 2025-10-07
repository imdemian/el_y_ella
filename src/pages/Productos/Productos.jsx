import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ProductoService } from "../../services/supabase/productoService";
import BasicModal from "../../components/BasicModal/BasicModal";
import RegistroProducto from "./RegistrarProductos";
import DataTable from "react-data-table-component";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faSpinner,
  faTrashCan,
  faPlus,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import EliminarProducto from "./Eliminar.Producto";
import { toast } from "react-toastify";
import "./Productos.scss";

export default function ProductosScreen() {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  // Cargar productos
  const cargarProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductoService.listarProductos({
        page: 1,
        limit: 100,
        activo: "all",
      });

      // La respuesta tiene estructura { data: [...], pagination: {...} }
      const productosData = response.data || [];
      setProductos(productosData);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError(error.message);
      toast.error(error.message || "Error al cargar productos");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    cargarProductos();
  }, []);

  // Abrir modal registrar
  const registrarProducto = () => {
    setContentModal(
      <RegistroProducto
        producto={null}
        setShow={setShowModal}
        refetch={cargarProductos}
      />
    );
    setModalTitle("Registrar Producto");
    setSize("lg");
    setShowModal(true);
  };

  // Editar
  const handleEdit = useCallback((row) => {
    setContentModal(
      <RegistroProducto
        producto={row}
        setShow={setShowModal}
        refetch={cargarProductos}
      />
    );
    setModalTitle("Editar Producto");
    setSize("lg");
    setShowModal(true);
  }, []);

  // Eliminar
  const handleDelete = useCallback((row) => {
    setContentModal(
      <EliminarProducto
        producto={row}
        setShow={setShowModal}
        refetch={cargarProductos}
      />
    );
    setModalTitle("Desactivar Producto");
    setSize("md");
    setShowModal(true);
  }, []);

  // Filtrar productos
  const productosFiltrados = useMemo(() => {
    if (!filterText) return productos;
    return productos.filter(
      (producto) =>
        producto.nombre?.toLowerCase().includes(filterText.toLowerCase()) ||
        producto.descripcion
          ?.toLowerCase()
          .includes(filterText.toLowerCase()) ||
        producto.categorias?.nombre
          ?.toLowerCase()
          .includes(filterText.toLowerCase())
    );
  }, [productos, filterText]);

  const columns = useMemo(
    () => [
      {
        name: "Nombre",
        selector: (row) => row.nombre || "Sin nombre",
        sortable: true,
        grow: 2,
      },
      {
        name: "Descripción",
        selector: (row) => row.descripcion || "Sin descripción",
        sortable: true,
        grow: 2,
      },
      {
        name: "Categoría",
        selector: (row) => row.categorias?.nombre || "Sin categoría",
        sortable: true,
        grow: 1,
      },
      {
        name: "Precio Base",
        selector: (row) => `$${parseFloat(row.precio_base || 0).toFixed(2)}`,
        sortable: true,
        right: true,
        grow: 1,
      },
      {
        name: "Estado",
        cell: (row) => (
          <span
            className={`badge-estado ${row.activo ? "activo" : "inactivo"}`}
          >
            {row.activo ? "Activo" : "Inactivo"}
          </span>
        ),
        center: true,
        grow: 1,
      },
      {
        name: "Acciones",
        cell: (row) => (
          <div className="d-flex">
            <button
              className="btn-action btn-edit"
              onClick={() => handleEdit(row)}
              title="Editar"
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              className="btn-action btn-delete"
              onClick={() => handleDelete(row)}
              title="Desactivar"
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
          </div>
        ),
        ignoreRowClick: true,
        center: true,
        grow: 1,
      },
    ],
    [handleDelete, handleEdit]
  );

  const customStyles = {
    headRow: {
      style: {
        background: "linear-gradient(135deg, #9b7fa8 0%, #8f749f 100%)",
        color: "white",
        fontWeight: "600",
        fontSize: "1rem",
        minHeight: "56px",
      },
    },
    headCells: {
      style: {
        color: "white",
        fontSize: "1rem",
        fontWeight: "600",
      },
    },
    rows: {
      style: {
        minHeight: "60px",
        fontSize: "0.95rem",
        "&:hover": {
          backgroundColor: "#f9fafb",
          cursor: "pointer",
        },
      },
    },
    cells: {
      style: {
        paddingLeft: "16px",
        paddingRight: "16px",
      },
    },
  };

  return (
    <div className="productos-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Productos</h1>
          <button className="btn-registrar" onClick={registrarProducto}>
            <FontAwesomeIcon icon={faPlus} />
            Registrar Producto
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="input-group">
          <span
            className="input-group-text"
            style={{
              borderRadius: "12px 0 0 12px",
              background: "white",
              border: "2px solid #e9ecef",
              borderRight: "none",
            }}
          >
            <FontAwesomeIcon icon={faSearch} style={{ color: "#9b7fa8" }} />
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar productos por nombre, descripción o categoría..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ borderLeft: "none", borderRadius: "0 12px 12px 0" }}
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && productos.length === 0 ? (
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Cargando productos...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={productosFiltrados}
          pagination
          paginationPerPage={10}
          paginationRowsPerPageOptions={[10, 20, 50, 100]}
          highlightOnHover
          responsive
          noDataComponent="No hay productos disponibles"
          customStyles={customStyles}
        />
      )}

      <BasicModal
        show={showModal}
        setShow={setShowModal}
        title={modalTitle}
        size={size || "lg"}
      >
        {contentModal}
      </BasicModal>
    </div>
  );
}
