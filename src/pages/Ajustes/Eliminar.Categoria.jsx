// src/pages/Ajustes/Eliminar.Categoria.jsx
import React, { useState } from "react";
import { CategoriaService } from "../../services/supabase/categoriaService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faLayerGroup,
  faFileAlt,
  faSpinner,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import "./Eliminar.Categoria.scss";

export default function EliminarCategoria({ categoria, setShow, refetch }) {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await CategoriaService.eliminarCategoria(categoria.id);
      toast.success("✅ Categoría eliminada exitosamente");
      if (refetch) await refetch();
      setShow(false);
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      toast.error(error.message || "Error al eliminar la categoría");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eliminar-categoria">
      <div className="warning-header">
        <div className="warning-icon">
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </div>
        <h3>Eliminar Categoría</h3>
        <p>Esta acción no se puede deshacer</p>
      </div>

      <div className="info-card">
        <div className="info-row">
          <div className="info-icon">
            <FontAwesomeIcon icon={faLayerGroup} />
          </div>
          <div className="info-content">
            <div className="info-label">Nombre de la Categoría</div>
            <div className="info-value">{categoria.nombre || "Sin nombre"}</div>
          </div>
        </div>

        <div className="info-row">
          <div className="info-icon">
            <FontAwesomeIcon icon={faFileAlt} />
          </div>
          <div className="info-content">
            <div className="info-label">Descripción</div>
            <div className="info-value">
              {categoria.descripcion || "Sin descripción"}
            </div>
          </div>
        </div>
      </div>

      <div className="warning-box">
        <div className="warning-box-icon">
          <FontAwesomeIcon icon={faExclamationCircle} />
        </div>
        <div className="warning-box-content">
          <p>
            <strong>¡Atención!</strong> Eliminar esta categoría podría afectar a
            los productos que la tienen asignada. Asegúrate de que ningún
            producto dependa de esta categoría antes de continuar.
          </p>
        </div>
      </div>

      {!showConfirmation ? (
        <div className="action-buttons">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShow(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-delete"
            onClick={() => setShowConfirmation(true)}
          >
            Eliminar Categoría
          </button>
        </div>
      ) : (
        <div className="confirmation-section">
          <div className="confirmation-icon">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <p>¿Estás completamente seguro de eliminar esta categoría?</p>
          <div className="confirmation-buttons">
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
              className="btn-confirm"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading && (
                <FontAwesomeIcon icon={faSpinner} spin className="spinner" />
              )}
              Confirmar Eliminación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
