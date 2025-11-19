// src/pages/Ajustes/components/EliminarComision.jsx
import React, { useState } from "react";
import { ComisionService } from "../../../services/supabase/comisionService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashCan,
  faTimes,
  faSpinner,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

export default function EliminarComision({ comision, setShow, refetch }) {
  const [loading, setLoading] = useState(false);

  const handleEliminar = async () => {
    setLoading(true);
    try {
      await ComisionService.eliminarComision(comision.id);
      toast.success("Comisión eliminada exitosamente");
      refetch();
      setShow(false);
    } catch (error) {
      console.error("Error al eliminar comisión:", error);
      toast.error(error.message || "Error al eliminar comisión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eliminar-modal">
      <div className="warning-icon">
        <FontAwesomeIcon icon={faExclamationTriangle} />
      </div>

      <h3>¿Estás seguro?</h3>
      <p>
        Estás a punto de eliminar la comisión{" "}
        <strong>"{comision.nombre}"</strong>.
      </p>
      <p className="warning-text">
        Esta acción no se puede deshacer. Los registros históricos de comisiones
        ya calculadas no se verán afectados.
      </p>

      <div className="modal-actions">
        <button
          type="button"
          className="btn-cancel"
          onClick={() => setShow(false)}
          disabled={loading}
        >
          <FontAwesomeIcon icon={faTimes} /> Cancelar
        </button>
        <button
          type="button"
          className="btn-delete"
          onClick={handleEliminar}
          disabled={loading}
        >
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Eliminando...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faTrashCan} /> Eliminar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
