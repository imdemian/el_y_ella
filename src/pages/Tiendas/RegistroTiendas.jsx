import React, { useState } from "react";
import { TiendaService } from "../../services/supabase/tiendaService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStore,
  faMapMarkerAlt,
  faPhone,
  faToggleOn,
  faToggleOff,
} from "@fortawesome/free-solid-svg-icons";
import "./RegistroTiendas.scss";

export default function RegistroTiendas({ tienda, setShow, refetch }) {
  const isEdit = !!tienda;

  const [form, setForm] = useState({
    nombre: tienda?.nombre || "",
    direccion: tienda?.direccion || "",
    telefono: tienda?.telefono || "",
    activa: tienda?.activa !== undefined ? tienda.activa : true,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await TiendaService.actualizarTienda(tienda.id, form);
        toast.success("✅ Tienda actualizada correctamente");
      } else {
        await TiendaService.crearTienda(form);
        toast.success("✅ Tienda registrada correctamente");
      }
      setShow(false);
      if (refetch) refetch();
    } catch (error) {
      console.error("Error al guardar tienda:", error);
      toast.error(error.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registro-tienda-form">
      <div className="form-header">
        <h3>{isEdit ? "Editar Tienda" : "Registrar Nueva Tienda"}</h3>
        <p className="form-subtitle">
          {isEdit
            ? "Actualiza la información de la tienda"
            : "Completa los datos para crear una nueva tienda"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre" className="form-label">
            <FontAwesomeIcon icon={faStore} /> Nombre de la Tienda
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            placeholder="Ej: Tienda Centro"
            value={form.nombre}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="direccion" className="form-label">
            <FontAwesomeIcon icon={faMapMarkerAlt} /> Dirección
          </label>
          <textarea
            id="direccion"
            name="direccion"
            placeholder="Ej: Av. Principal #123, Col. Centro"
            value={form.direccion}
            onChange={handleChange}
            className="form-textarea"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="telefono" className="form-label">
            <FontAwesomeIcon icon={faPhone} /> Teléfono
          </label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            placeholder="Ej: 555-1234"
            value={form.telefono}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        {isEdit && (
          <div className="form-group">
            <label className="form-label-switch">
              <div className="switch-info">
                <FontAwesomeIcon
                  icon={form.activa ? faToggleOn : faToggleOff}
                  className={`switch-icon ${form.activa ? "active" : ""}`}
                />
                <span>Estado de la Tienda</span>
              </div>
              <div className="switch-container">
                <input
                  type="checkbox"
                  id="activa"
                  name="activa"
                  checked={form.activa}
                  onChange={handleChange}
                  className="switch-checkbox"
                />
                <label htmlFor="activa" className="switch-label">
                  <span className="switch-button"></span>
                </label>
                <span className="switch-status">
                  {form.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
            </label>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShow(false)}
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                {isEdit ? "Actualizando..." : "Registrando..."}
              </>
            ) : (
              <>{isEdit ? "Actualizar Tienda" : "Registrar Tienda"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
