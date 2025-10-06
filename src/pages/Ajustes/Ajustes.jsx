// src/pages/Ajustes/Ajustes.jsx
import React, { useState, useEffect, useCallback } from "react";
import { CategoriaService } from "../../services/supabase/categoriaService";
import BasicModal from "../../components/BasicModal/BasicModal";
import CategoriaModal from "./Categoria.Modal";
import EliminarCategoria from "./Eliminar.Categoria";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faLayerGroup,
  faPercent,
  faKey,
  faMoneyBillWave,
  faPlus,
  faPen,
  faTrashCan,
  faSpinner,
  faExclamationTriangle,
  faInbox,
  faCalendar,
} from "@fortawesome/free-solid-svg-icons";
import "./Ajustes.scss";

export default function Ajustes() {
  const [activeTab, setActiveTab] = useState("categorias");
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("md");

  // Cargar categorías
  const cargarCategorias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CategoriaService.obtenerCategorias();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      setError(error.message);
      toast.error(error.message || "Error al cargar categorías");
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "categorias") {
      cargarCategorias();
    }
  }, [activeTab, cargarCategorias]);

  // Abrir modal crear categoría
  const crearCategoria = () => {
    setContentModal(
      <CategoriaModal
        categoria={null}
        setShow={setShowModal}
        refetch={cargarCategorias}
      />
    );
    setModalTitle("Nueva Categoría");
    setSize("md");
    setShowModal(true);
  };

  // Editar categoría
  const handleEditCategoria = useCallback(
    (categoria) => {
      setContentModal(
        <CategoriaModal
          categoria={categoria}
          setShow={setShowModal}
          refetch={cargarCategorias}
        />
      );
      setModalTitle("Editar Categoría");
      setSize("md");
      setShowModal(true);
    },
    [cargarCategorias]
  );

  // Eliminar categoría
  const handleDeleteCategoria = useCallback(
    (categoria) => {
      setContentModal(
        <EliminarCategoria
          categoria={categoria}
          setShow={setShowModal}
          refetch={cargarCategorias}
        />
      );
      setModalTitle("Eliminar Categoría");
      setSize("md");
      setShowModal(true);
    },
    [cargarCategorias]
  );

  // Renderizar contenido de categorías
  const renderCategorias = () => {
    if (loading) {
      return (
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Cargando categorías...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-message">
          <FontAwesomeIcon icon={faExclamationTriangle} className="icon" />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      );
    }

    if (categorias.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <FontAwesomeIcon icon={faInbox} />
          </div>
          <h4>No hay categorías registradas</h4>
          <p>Crea tu primera categoría para organizar tus productos</p>
        </div>
      );
    }

    return (
      <div className="categorias-grid">
        {categorias.map((categoria) => (
          <div key={categoria.id} className="categoria-card">
            <div className="categoria-header">
              <div className="categoria-icon">
                <FontAwesomeIcon icon={faLayerGroup} />
              </div>
              <div className="categoria-actions">
                <button
                  className="btn-edit"
                  onClick={() => handleEditCategoria(categoria)}
                  title="Editar"
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteCategoria(categoria)}
                  title="Eliminar"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            </div>
            <div className="categoria-info">
              <h4>{categoria.nombre}</h4>
              <p>{categoria.descripcion || "Sin descripción"}</p>
              <div className="categoria-meta">
                <div className="meta-item">
                  <FontAwesomeIcon icon={faCalendar} />
                  <span>
                    {categoria.created_at
                      ? new Date(categoria.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Renderizar contenido de descuentos (próximamente)
  const renderDescuentos = () => (
    <div className="coming-soon-card">
      <div className="coming-soon-icon">
        <FontAwesomeIcon icon={faPercent} />
      </div>
      <h3>Gestión de Descuentos</h3>
      <p>
        Esta funcionalidad estará disponible próximamente. Podrás crear y
        gestionar descuentos, ofertas especiales y promociones.
      </p>
    </div>
  );

  // Renderizar contenido de códigos de acceso (próximamente)
  const renderCodigosAcceso = () => (
    <div className="coming-soon-card">
      <div className="coming-soon-icon">
        <FontAwesomeIcon icon={faKey} />
      </div>
      <h3>Códigos de Acceso</h3>
      <p>
        Esta funcionalidad estará disponible próximamente. Podrás generar y
        gestionar códigos de acceso especiales para empleados y clientes.
      </p>
    </div>
  );

  // Renderizar contenido de comisiones (próximamente)
  const renderComisiones = () => (
    <div className="coming-soon-card">
      <div className="coming-soon-icon">
        <FontAwesomeIcon icon={faMoneyBillWave} />
      </div>
      <h3>Gestión de Comisiones</h3>
      <p>
        Esta funcionalidad estará disponible próximamente. Podrás configurar y
        gestionar comisiones para empleados y vendedores.
      </p>
    </div>
  );

  return (
    <div className="ajustes-page">
      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faCog} className="icon" />
          Ajustes del Sistema
        </h1>
        <p>Configura y personaliza tu sistema de gestión</p>
      </div>

      <div className="ajustes-tabs">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${
                activeTab === "categorias" ? "active" : ""
              }`}
              onClick={() => setActiveTab("categorias")}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="icon" />
              Categorías
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${
                activeTab === "descuentos" ? "active" : ""
              }`}
              onClick={() => setActiveTab("descuentos")}
            >
              <FontAwesomeIcon icon={faPercent} className="icon" />
              Descuentos
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "codigos" ? "active" : ""}`}
              onClick={() => setActiveTab("codigos")}
            >
              <FontAwesomeIcon icon={faKey} className="icon" />
              Códigos de Acceso
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${
                activeTab === "comisiones" ? "active" : ""
              }`}
              onClick={() => setActiveTab("comisiones")}
            >
              <FontAwesomeIcon icon={faMoneyBillWave} className="icon" />
              Comisiones
            </button>
          </li>
        </ul>

        <div className="tab-content">
          {activeTab === "categorias" && (
            <>
              <div className="section-header">
                <h3>
                  <FontAwesomeIcon icon={faLayerGroup} className="icon" />
                  Categorías de Productos
                </h3>
                <button className="btn-add" onClick={crearCategoria}>
                  <FontAwesomeIcon icon={faPlus} />
                  Nueva Categoría
                </button>
              </div>
              {renderCategorias()}
            </>
          )}

          {activeTab === "descuentos" && (
            <>
              <div className="section-header">
                <h3>
                  <FontAwesomeIcon icon={faPercent} className="icon" />
                  Descuentos y Ofertas
                </h3>
                <button
                  className="btn-add"
                  onClick={() =>
                    toast.info("Funcionalidad próximamente disponible")
                  }
                  disabled
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Nuevo Descuento
                </button>
              </div>
              {renderDescuentos()}
            </>
          )}

          {activeTab === "codigos" && (
            <>
              <div className="section-header">
                <h3>
                  <FontAwesomeIcon icon={faKey} className="icon" />
                  Códigos de Acceso Especiales
                </h3>
                <button
                  className="btn-add"
                  onClick={() =>
                    toast.info("Funcionalidad próximamente disponible")
                  }
                  disabled
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Generar Código
                </button>
              </div>
              {renderCodigosAcceso()}
            </>
          )}

          {activeTab === "comisiones" && (
            <>
              <div className="section-header">
                <h3>
                  <FontAwesomeIcon icon={faMoneyBillWave} className="icon" />
                  Comisiones de Ventas
                </h3>
                <button
                  className="btn-add"
                  onClick={() =>
                    toast.info("Funcionalidad próximamente disponible")
                  }
                  disabled
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Nueva Comisión
                </button>
              </div>
              {renderComisiones()}
            </>
          )}
        </div>
      </div>

      <BasicModal
        show={showModal}
        setShow={setShowModal}
        title={modalTitle}
        size={size}
      >
        {contentModal}
      </BasicModal>
    </div>
  );
}
