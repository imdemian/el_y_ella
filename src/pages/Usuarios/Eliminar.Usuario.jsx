import { useEffect, useState } from "react";
import { UsuariosService } from "../../services/supabase/usuariosService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faUser,
  faEnvelope,
  faUserTag,
  faIdCard,
} from "@fortawesome/free-solid-svg-icons";
import "./Eliminar.Usuario.scss";

const EliminarUsuario = ({ usuario, setShow, refetch }) => {
  const [loading, setLoading] = useState(false);
  // Inicializar los datos
  const [formData, setFormData] = useState({
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    empleadoId: usuario.empleadoId,
  });

  // Actualiza formData si la prop 'usuario' cambia (modo edición)
  useEffect(() => {
    if (usuario) {
      setFormData({
        id: usuario.id,
        email: usuario.email || "",
        nombre: usuario.nombre || "",
        rol: usuario.rol || "",
        empleadoId: usuario.empleadoId || "",
      });
    }
  }, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await UsuariosService.eliminarUsuario(formData.id);
      toast.success("✅ Usuario eliminado con éxito");
      setShow(false);
      if (refetch) refetch();
    } catch (error) {
      console.error(error);
      const msg = error.message || "Error al eliminar el usuario.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eliminar-usuario-modal">
      <div className="warning-header">
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          className="warning-icon"
        />
        <h3>Eliminar Usuario</h3>
      </div>

      <div className="warning-message">
        <p>¿Estás seguro de que deseas eliminar al siguiente usuario?</p>
        <p className="warning-text">
          Esta acción no se puede deshacer y eliminará permanentemente toda la
          información del usuario.
        </p>
      </div>

      <div className="usuario-info">
        <div className="info-item">
          <FontAwesomeIcon icon={faUser} className="info-icon" />
          <div>
            <label>Nombre</label>
            <p>{formData.nombre}</p>
          </div>
        </div>

        <div className="info-item">
          <FontAwesomeIcon icon={faEnvelope} className="info-icon" />
          <div>
            <label>Email</label>
            <p>{formData.email}</p>
          </div>
        </div>

        <div className="info-item">
          <FontAwesomeIcon icon={faUserTag} className="info-icon" />
          <div>
            <label>Rol</label>
            <p className={`badge-rol badge-rol-${formData.rol?.toLowerCase()}`}>
              {formData.rol}
            </p>
          </div>
        </div>

        {formData.empleadoId && (
          <div className="info-item">
            <FontAwesomeIcon icon={faIdCard} className="info-icon" />
            <div>
              <label>ID Empleado</label>
              <p>{formData.empleadoId}</p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShow(false)}
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-delete" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Eliminando...
              </>
            ) : (
              "Eliminar Usuario"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EliminarUsuario;
