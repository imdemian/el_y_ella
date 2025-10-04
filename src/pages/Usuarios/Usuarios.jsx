import { useCallback, useEffect, useMemo, useState } from "react";
import BasicModal from "../../components/BasicModal/BasicModal";
import { UsuariosService } from "../../services/supabase/usuariosService";
import DataTable from "react-data-table-component";
import RegistroUsuario from "./Registro.Usuario";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faTrashCan,
  faUserPlus,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import EliminarUsuario from "./Eliminar.Usuario";
import "./Usuarios.scss";

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [error, setError] = useState(null);

  //Propiedades del modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  // Función para abrir el modal para registrar un usuario
  const registrarUsuarios = (content) => {
    setContentModal(content);
    setModalTitle("Registrar Usuario");
    setSize("md");
    setShowModal(true);
  };

  // Función para abrir el modal para editar un usuario
  const handleEdit = useCallback(
    (usuario) => {
      setContentModal(
        <RegistroUsuario
          usuario={usuario}
          setShow={setShowModal}
          refetch={cargarUsuarios}
        />
      );
      setModalTitle("Editar Usuario");
      setSize("md");
      setShowModal(true);
    },
    [setContentModal, setModalTitle, setSize, setShowModal]
  );

  const handleDelete = useCallback(
    (usuario) => {
      setContentModal(
        <EliminarUsuario
          usuario={usuario}
          setShow={setShowModal}
          refetch={cargarUsuarios}
        />
      );
      setModalTitle("Eliminar Usuario");
      setSize("md");
      setShowModal(true);
    },
    [setContentModal, setModalTitle, setSize, setShowModal]
  );

  useEffect(() => {
    cargarUsuarios();
  }, [showModal]);

  const cargarUsuarios = async () => {
    setLoading(true);
    setError(null);

    // Debug: Verificar token
    const token = localStorage.getItem("auth_token");
    const user = localStorage.getItem("app_user");

    console.log("🔑 Token presente:", !!token);
    console.log("👤 Usuario:", user ? JSON.parse(user) : "No hay usuario");

    if (!token) {
      setError("No estás autenticado. Por favor, inicia sesión nuevamente.");
      setLoading(false);
      return;
    }

    try {
      let data = await UsuariosService.obtenerUsuarios();
      let lista = Array.isArray(data)
        ? data
        : Array.isArray(data.usuarios)
        ? data.usuarios
        : Array.isArray(data.data)
        ? data.data
        : Object.values(data);
      setUsuarios(lista);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      setError(error.message || "Error al cargar usuarios");
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuarios por texto de búsqueda
  const usuariosFiltrados = useMemo(() => {
    if (!filterText) return usuarios;
    return usuarios.filter(
      (usuario) =>
        usuario.nombre?.toLowerCase().includes(filterText.toLowerCase()) ||
        usuario.email?.toLowerCase().includes(filterText.toLowerCase()) ||
        usuario.rol?.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [usuarios, filterText]);

  const columns = useMemo(
    () => [
      {
        name: "Email",
        selector: (row) => row.email,
        sortable: true,
        grow: 2,
      },
      {
        name: "Nombre",
        selector: (row) => row.nombre + " " + (row.apellido || ""),
        sortable: true,
        grow: 2,
      },
      {
        name: "Rol",
        selector: (row) => row.rol,
        sortable: true,
        cell: (row) => (
          <span className={`badge-rol badge-rol-${row.rol?.toLowerCase()}`}>
            {row.rol}
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
              title="Editar usuario"
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              className="btn-action btn-action-delete"
              onClick={() => handleDelete(row)}
              title="Eliminar usuario"
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
          </div>
        ),
      },
    ],
    [handleDelete, handleEdit]
  );

  // Estilos personalizados para la tabla
  const customStyles = {
    table: {
      style: {
        backgroundColor: "transparent",
      },
    },
    headRow: {
      style: {
        backgroundColor: "rgba(155, 127, 168, 0.1)",
        borderRadius: "12px 12px 0 0",
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
        borderTop: "1px solid rgba(155, 127, 168, 0.2)",
        minHeight: "56px",
      },
    },
  };

  return (
    <div className="usuarios-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <FontAwesomeIcon icon={faUsers} className="page-icon" />
            <h1>Gestión de Usuarios</h1>
          </div>
          <p className="page-description">
            Administra los usuarios del sistema
          </p>
        </div>
        <button
          className="btn-primary-custom"
          onClick={() =>
            registrarUsuarios(
              <RegistroUsuario
                usuario={null}
                setShow={setShowModal}
                refetch={cargarUsuarios}
              />
            )
          }
        >
          <FontAwesomeIcon icon={faUserPlus} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nombre, email o rol..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Tabla de usuarios */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p>Cargando usuarios...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <FontAwesomeIcon icon={faUsers} size="3x" />
            <h3>Error al cargar usuarios</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={cargarUsuarios}>
              Reintentar
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={usuariosFiltrados}
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={[5, 10, 15, 20, 25]}
            highlightOnHover
            pointerOnHover
            responsive
            customStyles={customStyles}
            noDataComponent={
              <div className="no-data">
                <FontAwesomeIcon icon={faUsers} size="3x" />
                <p>No hay usuarios registrados</p>
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
};

export default Usuarios;
