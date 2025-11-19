// src/pages/Ajustes/Ajustes.jsx
import React, { useState, useEffect, useCallback } from "react";
import { CategoriaService } from "../../services/supabase/categoriaService";
import { ComisionService } from "../../services/supabase/comisionService";
import { DescuentoService } from "../../services/supabase/descuentoService";
import { CodigoAccesoService } from "../../services/supabase/codigoAccesoService";
import BasicModal from "../../components/BasicModal/BasicModal";
import CategoriaModal from "./Categoria.Modal";
import EliminarCategoria from "./Eliminar.Categoria";
import ComisionModal from "./components/ComisionModal";
import EliminarComision from "./components/EliminarComision";
import DescuentoModal from "./components/DescuentoModal";
import CodigoAccesoModal from "./components/CodigoAccesoModal";
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
  const [comisiones, setComisiones] = useState([]);
  const [descuentos, setDescuentos] = useState([]);
  const [codigosAcceso, setCodigosAcceso] = useState([]);
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

  // Cargar comisiones
  const cargarComisiones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ComisionService.obtenerComisiones();
      setComisiones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar comisiones:", error);
      setError(error.message);
      toast.error(error.message || "Error al cargar comisiones");
      setComisiones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar descuentos
  const cargarDescuentos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DescuentoService.obtenerDescuentos();
      setDescuentos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar descuentos:", error);
      setError(error.message);
      toast.error(error.message || "Error al cargar descuentos");
      setDescuentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar códigos de acceso
  const cargarCodigosAcceso = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CodigoAccesoService.obtenerCodigos();
      setCodigosAcceso(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar códigos de acceso:", error);
      setError(error.message);
      toast.error(error.message || "Error al cargar códigos de acceso");
      setCodigosAcceso([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "categorias") {
      cargarCategorias();
    } else if (activeTab === "comisiones") {
      cargarComisiones();
    } else if (activeTab === "descuentos") {
      cargarDescuentos();
    } else if (activeTab === "codigos") {
      cargarCodigosAcceso();
    }
  }, [
    activeTab,
    cargarCategorias,
    cargarComisiones,
    cargarDescuentos,
    cargarCodigosAcceso,
  ]);

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

  // Funciones para descuentos
  const crearDescuento = () => {
    setContentModal(
      <DescuentoModal
        descuento={null}
        setShow={setShowModal}
        refetch={cargarDescuentos}
      />
    );
    setModalTitle("Nuevo Código de Descuento");
    setSize("lg");
    setShowModal(true);
  };

  const handleEditDescuento = useCallback(
    (descuento) => {
      setContentModal(
        <DescuentoModal
          descuento={descuento}
          setShow={setShowModal}
          refetch={cargarDescuentos}
        />
      );
      setModalTitle("Editar Descuento");
      setSize("lg");
      setShowModal(true);
    },
    [cargarDescuentos]
  );

  const handleDeleteDescuento = useCallback(
    (descuento) => {
      if (window.confirm(`¿Eliminar descuento "${descuento.codigo}"?`)) {
        DescuentoService.eliminarDescuento(descuento.id)
          .then(() => {
            toast.success("Descuento eliminado");
            cargarDescuentos();
          })
          .catch((error) => {
            toast.error(error.message || "Error al eliminar descuento");
          });
      }
    },
    [cargarDescuentos]
  );

  // Renderizar contenido de descuentos
  const renderDescuentos = () => {
    if (loading) {
      return (
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Cargando descuentos...</p>
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

    if (descuentos.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <FontAwesomeIcon icon={faInbox} />
          </div>
          <h4>No hay descuentos registrados</h4>
          <p>Crea tu primer código de descuento para promociones</p>
        </div>
      );
    }

    return (
      <div className="descuentos-table">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Usos</th>
              <th>Estado</th>
              <th>Vigencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {descuentos.map((descuento) => (
              <tr key={descuento.id}>
                <td>
                  <code className="codigo-descuento">{descuento.codigo}</code>
                </td>
                <td>{descuento.nombre}</td>
                <td>
                  <span className="badge">
                    {descuento.tipo_descuento === "porcentaje" ? "%" : "$"}
                  </span>
                </td>
                <td>
                  {descuento.tipo_descuento === "porcentaje"
                    ? `${descuento.valor}%`
                    : `$${descuento.valor}`}
                </td>
                <td>
                  {descuento.usos_actuales || 0}
                  {descuento.usos_maximos
                    ? ` / ${descuento.usos_maximos}`
                    : " / ∞"}
                </td>
                <td>
                  <span
                    className={`badge ${
                      descuento.activo ? "badge-success" : "badge-danger"
                    }`}
                  >
                    {descuento.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  {new Date(descuento.fecha_inicio).toLocaleDateString()} -{" "}
                  {new Date(descuento.fecha_fin).toLocaleDateString()}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-edit-small"
                      onClick={() => handleEditDescuento(descuento)}
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      className="btn-delete-small"
                      onClick={() => handleDeleteDescuento(descuento)}
                      title="Eliminar"
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Funciones para códigos de acceso
  const crearCodigoAcceso = () => {
    setContentModal(
      <CodigoAccesoModal
        codigo={null}
        setShow={setShowModal}
        refetch={cargarCodigosAcceso}
      />
    );
    setModalTitle("Generar Código de Acceso");
    setSize("lg");
    setShowModal(true);
  };

  const handleEditCodigoAcceso = useCallback(
    (codigo) => {
      setContentModal(
        <CodigoAccesoModal
          codigo={codigo}
          setShow={setShowModal}
          refetch={cargarCodigosAcceso}
        />
      );
      setModalTitle("Editar Código de Acceso");
      setSize("lg");
      setShowModal(true);
    },
    [cargarCodigosAcceso]
  );

  const handleDeleteCodigoAcceso = useCallback(
    (codigo) => {
      if (window.confirm(`¿Eliminar código de acceso "${codigo.codigo}"?`)) {
        CodigoAccesoService.eliminarCodigo(codigo.id)
          .then(() => {
            toast.success("Código de acceso eliminado");
            cargarCodigosAcceso();
          })
          .catch((error) => {
            toast.error(error.message || "Error al eliminar código");
          });
      }
    },
    [cargarCodigosAcceso]
  );

  // Renderizar contenido de códigos de acceso
  const renderCodigosAcceso = () => {
    if (loading) {
      return (
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Cargando códigos de acceso...</p>
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

    if (codigosAcceso.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <FontAwesomeIcon icon={faInbox} />
          </div>
          <h4>No hay códigos de acceso registrados</h4>
          <p>Genera tu primer código de acceso especial</p>
        </div>
      );
    }

    return (
      <div className="codigos-table">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Nivel</th>
              <th>Usos</th>
              <th>Estado</th>
              <th>Vigencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {codigosAcceso.map((codigo) => (
              <tr key={codigo.id}>
                <td>
                  <code className="codigo-acceso">{codigo.codigo}</code>
                </td>
                <td>{codigo.descripcion || "Sin descripción"}</td>
                <td>
                  <span className="badge-secondary">{codigo.tipo_acceso}</span>
                </td>
                <td>
                  <span className="badge">{codigo.nivel_acceso}</span>
                </td>
                <td>
                  {codigo.usos_actuales || 0}
                  {codigo.usos_maximos ? ` / ${codigo.usos_maximos}` : " / ∞"}
                </td>
                <td>
                  <span
                    className={`badge ${
                      codigo.activo ? "badge-success" : "badge-danger"
                    }`}
                  >
                    {codigo.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  {new Date(codigo.fecha_inicio).toLocaleDateString()} -{" "}
                  {codigo.fecha_fin
                    ? new Date(codigo.fecha_fin).toLocaleDateString()
                    : "∞"}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-edit-small"
                      onClick={() => handleEditCodigoAcceso(codigo)}
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      className="btn-delete-small"
                      onClick={() => handleDeleteCodigoAcceso(codigo)}
                      title="Eliminar"
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Funciones para comisiones
  const crearComision = () => {
    setContentModal(
      <ComisionModal
        comision={null}
        setShow={setShowModal}
        refetch={cargarComisiones}
      />
    );
    setModalTitle("Nueva Comisión");
    setSize("lg");
    setShowModal(true);
  };

  const handleEditComision = useCallback(
    (comision) => {
      setContentModal(
        <ComisionModal
          comision={comision}
          setShow={setShowModal}
          refetch={cargarComisiones}
        />
      );
      setModalTitle("Editar Comisión");
      setSize("lg");
      setShowModal(true);
    },
    [cargarComisiones]
  );

  const handleDeleteComision = useCallback(
    (comision) => {
      setContentModal(
        <EliminarComision
          comision={comision}
          setShow={setShowModal}
          refetch={cargarComisiones}
        />
      );
      setModalTitle("Eliminar Comisión");
      setSize("md");
      setShowModal(true);
    },
    [cargarComisiones]
  );

  // Renderizar contenido de comisiones
  const renderComisiones = () => {
    if (loading) {
      return (
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Cargando comisiones...</p>
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

    if (comisiones.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <FontAwesomeIcon icon={faInbox} />
          </div>
          <h4>No hay comisiones registradas</h4>
          <p>Crea tu primera comisión para incentivar ventas</p>
        </div>
      );
    }

    return (
      <div className="comisiones-table">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Aplica a</th>
              <th>Estado</th>
              <th>Vigencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {comisiones.map((comision) => (
              <tr key={comision.id}>
                <td>{comision.nombre}</td>
                <td>
                  <span className="badge">
                    {comision.tipo_comision === "porcentaje" ? "%" : "$"}
                  </span>
                </td>
                <td>
                  {comision.tipo_comision === "porcentaje"
                    ? `${comision.valor}%`
                    : `$${comision.valor}`}
                </td>
                <td>
                  <span className="badge-secondary">{comision.aplica_a}</span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      comision.activo ? "badge-success" : "badge-danger"
                    }`}
                  >
                    {comision.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td>
                  {new Date(comision.fecha_inicio).toLocaleDateString()} -{" "}
                  {comision.fecha_fin
                    ? new Date(comision.fecha_fin).toLocaleDateString()
                    : "∞"}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-edit-small"
                      onClick={() => handleEditComision(comision)}
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      className="btn-delete-small"
                      onClick={() => handleDeleteComision(comision)}
                      title="Eliminar"
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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
                <button className="btn-add" onClick={crearDescuento}>
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
                <button className="btn-add" onClick={crearCodigoAcceso}>
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
                <button className="btn-add" onClick={crearComision}>
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
