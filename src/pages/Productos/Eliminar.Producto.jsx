// src/pages/Productos/Eliminar.Producto.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import { ProductoService } from "../../services/supabase/productoService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faBox,
  faTag,
  faDollarSign,
  faLayerGroup,
  faToggleOn,
  faToggleOff,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import "./Eliminar.Producto.scss";

export default function EliminarProducto({ producto, setShow, refetch }) {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await ProductoService.desactivarProducto(producto.id);
      toast.success("✅ Producto desactivado exitosamente");
      if (refetch) await refetch();
      setShow(false);
    } catch (error) {
      console.error("Error al desactivar producto:", error);
      toast.error(error.message || "Error al desactivar el producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eliminar-producto">
      <div className="warning-header">
        <div className="warning-icon">
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </div>
        <h3>Desactivar Producto</h3>
        <p>Esta acción desactivará el producto del sistema</p>
      </div>

      <div className="info-card">
        <div className="info-row">
          <div className="info-icon">
            <FontAwesomeIcon icon={faBox} />
          </div>
          <div className="info-content">
            <div className="info-label">Nombre del Producto</div>
            <div className="info-value">{producto.nombre || "Sin nombre"}</div>
          </div>
        </div>

        <div className="info-row">
          <div className="info-icon">
            <FontAwesomeIcon icon={faTag} />
          </div>
          <div className="info-content">
            <div className="info-label">Descripción</div>
            <div className="info-value">
              {producto.descripcion || "Sin descripción"}
            </div>
          </div>
        </div>

        <div className="info-row">
          <div className="info-icon">
            <FontAwesomeIcon icon={faLayerGroup} />
          </div>
          <div className="info-content">
            <div className="info-label">Categoría</div>
            <div className="info-value">
              {producto.categorias?.nombre ||
                producto.categoria ||
                "Sin categoría"}
            </div>
          </div>
        </div>

        <div className="info-row">
          <div className="info-icon">
            <FontAwesomeIcon icon={faDollarSign} />
          </div>
          <div className="info-content">
            <div className="info-label">Precio Base</div>
            <div className="info-value">
              $
              {parseFloat(
                producto.precio_base || producto.precioBase || 0
              ).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="info-row">
          <div className="info-icon">
            <FontAwesomeIcon
              icon={producto.activo ? faToggleOn : faToggleOff}
            />
          </div>
          <div className="info-content">
            <div className="info-label">Estado Actual</div>
            <div className="info-value">
              <span
                className={`badge-estado ${
                  producto.activo ? "activo" : "inactivo"
                }`}
              >
                {producto.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
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
            Desactivar Producto
          </button>
        </div>
      ) : (
        <div className="confirmation-section">
          <div className="confirmation-icon">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <p>¿Estás seguro de que deseas desactivar este producto?</p>
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
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
