import { useEffect, useState } from "react";
import { TiendaService } from "../../services/supabase/tiendaService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faStore,
  faMapMarkerAlt,
  faPhone,
  faToggleOn,
  faToggleOff,
} from "@fortawesome/free-solid-svg-icons";
import "./Eliminacion.Tienda.scss";

const EliminacionTienda = ({ tienda, setShow, refetch }) => {
  const [loading, setLoading] = useState(false);
  const [alertMessage] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Inicializar los datos
  const [formData] = useState({
    nombre: tienda?.nombre || "",
    direccion: tienda?.direccion || "",
    telefono: tienda?.telefono || "",
    activa: tienda?.activa,
  });

  // Función para verificar que no haya empleados (opcional, si tienes esta validación)
  const verificarEmpleados = async () => {
    try {
      // Si tienes un servicio de empleados, puedes verificar aquí
      // const empleados = await EmpleadoService.obtenerEmpleados();
      // const empleadosAsignados = empleados.some(emp => emp.tiendaId === tienda.id);
      // if (empleadosAsignados) {
      //   setAlertMessage("No se puede eliminar la tienda porque tiene empleados asignados.");
      // }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    verificarEmpleados();
  }, []);

  // Función para desactivar la tienda (soft delete)
  const handleDelete = async () => {
    if (alertMessage) return;

    setLoading(true);
    try {
      await TiendaService.desactivarTienda(tienda.id);
      toast.success("✅ Tienda desactivada exitosamente");

      // Recargar la lista antes de cerrar el modal
      if (refetch) {
        await refetch();
      }

      setShow(false);
    } catch (error) {
      console.error("Error al desactivar tienda:", error);
      toast.error(error.message || "Error al desactivar la tienda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eliminacion-tienda-modal">
      <div className="warning-header">
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          className="warning-icon"
        />
        <h3>Desactivar Tienda</h3>
      </div>

      <div className="warning-message">
        {alertMessage ? (
          <div className="alert alert-danger">
            <p>{alertMessage}</p>
          </div>
        ) : (
          <>
            <p>¿Estás seguro de que deseas desactivar la siguiente tienda?</p>
            <p className="warning-text">
              La tienda será marcada como inactiva pero sus datos se
              conservarán.
            </p>
          </>
        )}
      </div>

      <div className="tienda-info">
        <div className="info-item">
          <FontAwesomeIcon icon={faStore} className="info-icon" />
          <div>
            <label>Nombre</label>
            <p>{formData.nombre}</p>
          </div>
        </div>

        <div className="info-item">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="info-icon" />
          <div>
            <label>Dirección</label>
            <p>{formData.direccion || "Sin dirección"}</p>
          </div>
        </div>

        <div className="info-item">
          <FontAwesomeIcon icon={faPhone} className="info-icon" />
          <div>
            <label>Teléfono</label>
            <p>{formData.telefono || "Sin teléfono"}</p>
          </div>
        </div>

        <div className="info-item">
          <FontAwesomeIcon
            icon={formData.activa ? faToggleOn : faToggleOff}
            className="info-icon"
          />
          <div>
            <label>Estado Actual</label>
            <p
              className={`badge-estado ${
                formData.activa ? "badge-activa" : "badge-inactiva"
              }`}
            >
              {formData.activa ? "Activa" : "Inactiva"}
            </p>
          </div>
        </div>
      </div>

      {!showConfirmation ? (
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShow(false)}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-delete"
            onClick={() => setShowConfirmation(true)}
            disabled={!!alertMessage || loading}
          >
            Desactivar Tienda
          </button>
        </div>
      ) : (
        <div className="confirmation-section">
          <div className="confirmation-message">
            <p>
              <strong>¿Confirmas que deseas desactivar esta tienda?</strong>
            </p>
            <p>Esta acción cambiará el estado de la tienda a inactiva.</p>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-confirm-delete"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Desactivando...
                </>
              ) : (
                "Confirmar Desactivación"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EliminacionTienda;
