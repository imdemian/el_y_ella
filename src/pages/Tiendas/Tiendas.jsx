import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TiendaService } from "../../services/supabase/tiendaService";
import RegistroTiendas from "./RegistroTiendas";
import DataTable from "react-data-table-component";
import BasicModal from "../../components/BasicModal/BasicModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faTrashCan,
  faWarehouse,
  faStore,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import EliminacionTienda from "./Eliminacion.Tienda";
import "./Tiendas.scss";

export default function TiendasScreen() {
  const [tiendas, setTiendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  const navigate = useNavigate();

  // Registrar tienda
  const registrarTiendas = () => {
    setContentModal(
      <RegistroTiendas
        tienda={null}
        setShow={setShowModal}
        refetch={cargarTiendas}
      />
    );
    setModalTitle("Registrar Tienda");
    setSize("md");
    setShowModal(true);
  };

  // Editar tienda
  const handleEdit = useCallback((tienda) => {
    setContentModal(
      <RegistroTiendas
        tienda={tienda}
        setShow={setShowModal}
        refetch={cargarTiendas}
      />
    );
    setModalTitle("Editar Tienda");
    setSize("md");
    setShowModal(true);
  }, []);

  // Eliminar tienda
  const handleDelete = useCallback((tienda) => {
    setContentModal(
      <EliminacionTienda
        tienda={tienda}
        setShow={setShowModal}
        refetch={cargarTiendas}
      />
    );
    setModalTitle("Eliminar Tienda");
    setSize("md");
    setShowModal(true);
  }, []);

  // Ver inventario
  const handleInventory = useCallback(
    (tienda) => {
      navigate(`/tiendas/${tienda.id}/inventario`);
    },
    [navigate]
  );

  useEffect(() => {
    cargarTiendas();
  }, []);

  const cargarTiendas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TiendaService.obtenerTiendas();
      setTiendas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar tiendas:", error);
      setError(error.message);
      setTiendas([]);
    } finally {
      setLoading(false);
    }
  };

  const tiendasFiltradas = useMemo(() => {
    if (!filterText) return tiendas;
    return tiendas.filter(
      (tienda) =>
        tienda.nombre?.toLowerCase().includes(filterText.toLowerCase()) ||
        tienda.direccion?.toLowerCase().includes(filterText.toLowerCase()) ||
        tienda.telefono?.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [tiendas, filterText]);

  const columns = useMemo(
    () => [
      {
        name: "Nombre",
        selector: (row) => row.nombre,
        sortable: true,
        grow: 2,
      },
      {
        name: "Dirección",
        selector: (row) => row.direccion || "-",
        sortable: true,
        grow: 2,
      },
      {
        name: "Teléfono",
        selector: (row) => row.telefono || "-",
        sortable: true,
      },
      {
        name: "Estado",
        selector: (row) => row.activa,
        sortable: true,
        cell: (row) => (
          <span
            className={`badge-estado ${
              row.activa ? "badge-activa" : "badge-inactiva"
            }`}
          >
            {row.activa ? "Activa" : "Inactiva"}
          </span>
        ),
      },
      {
        name: "Acciones",
        center: true,
        cell: (row) => (
          <div className="action-buttons">
            <button
              className="btn-action btn-action-edit"
              onClick={() => handleEdit(row)}
              title="Editar tienda"
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              className="btn-action btn-action-delete"
              onClick={() => handleDelete(row)}
              title="Eliminar tienda"
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
            <button
              className="btn-action btn-action-inventory"
              onClick={() => handleInventory(row)}
              title="Ver inventario"
            >
              <FontAwesomeIcon icon={faWarehouse} />
            </button>
          </div>
        ),
        ignoreRowClick: true,
      },
    ],
    [handleEdit, handleDelete, handleInventory]
  );

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: "rgba(155, 127, 168, 0.05)",
        borderBottom: "2px solid rgba(155, 127, 168, 0.2)",
        minHeight: "56px",
      },
    },
    headCells: {
      style: {
        fontSize: "0.95rem",
        fontWeight: "600",
        color: "#8f749f",
        paddingLeft: "16px",
        paddingRight: "16px",
      },
    },
    rows: {
      style: {
        minHeight: "60px",
        fontSize: "0.9rem",
        color: "#333",
        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: "rgba(155, 127, 168, 0.05)",
          transform: "scale(1.01)",
        },
      },
    },
    pagination: {
      style: {
        borderTop: "2px solid rgba(155, 127, 168, 0.2)",
        minHeight: "56px",
      },
    },
  };

  return (
    <div className="tiendas-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <FontAwesomeIcon icon={faStore} className="page-icon" />
            <h1>Tiendas</h1>
          </div>
          <p className="page-description">Administra las tiendas del sistema</p>
        </div>
        <button className="btn-primary-custom" onClick={registrarTiendas}>
          <FontAwesomeIcon icon={faPlus} />
          <span>Nueva Tienda</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nombre, dirección o teléfono..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Tabla de tiendas */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p>Cargando tiendas...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>Error al cargar tiendas</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={cargarTiendas}>
              Reintentar
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tiendasFiltradas}
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={[10, 20, 30, 50]}
            highlightOnHover
            responsive
            customStyles={customStyles}
            noDataComponent={
              <div className="no-data">
                <FontAwesomeIcon icon={faStore} className="no-data-icon" />
                <p>No hay tiendas registradas</p>
              </div>
            }
          />
        )}
      </div>

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
