// src/pages/Ajustes/components/CodigoAccesoModal.jsx
import React, { useState, useEffect } from "react";
import { CodigoAccesoService } from "../../../services/supabase/codigoAccesoService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSave,
  faTimes,
  faSpinner,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import "./CodigoAccesoModal.scss";

export default function CodigoAccesoModal({ codigoAcceso, setShow, refetch }) {
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    tipo_acceso: "temporal",
    nivel_acceso: "vendedor",
    usos_maximos: "",
    fecha_inicio: new Date().toISOString().slice(0, 16),
    fecha_fin: "",
    activo: true,
  });

  const [loading, setLoading] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState(null);

  useEffect(() => {
    if (codigoAcceso) {
      setFormData({
        codigo: codigoAcceso.codigo || "",
        nombre: codigoAcceso.nombre || "",
        descripcion: codigoAcceso.descripcion || "",
        tipo_acceso: codigoAcceso.tipo_acceso || "temporal",
        nivel_acceso: codigoAcceso.nivel_acceso || "vendedor",
        usos_maximos: codigoAcceso.usos_maximos || "",
        fecha_inicio: codigoAcceso.fecha_inicio
          ? new Date(codigoAcceso.fecha_inicio).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        fecha_fin: codigoAcceso.fecha_fin
          ? new Date(codigoAcceso.fecha_fin).toISOString().slice(0, 16)
          : "",
        activo: codigoAcceso.activo !== undefined ? codigoAcceso.activo : true,
      });
    }
  }, [codigoAcceso]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const generarCodigoAleatorio = () => {
    const codigo = CodigoAccesoService.generarCodigoAleatorio(12);
    setFormData((prev) => ({ ...prev, codigo }));
  };

  const copiarCodigo = (codigo) => {
    navigator.clipboard.writeText(codigo);
    toast.success("Código copiado al portapapeles");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        toast.error("El nombre es obligatorio");
        return;
      }

      if (!formData.fecha_inicio) {
        toast.error("La fecha de inicio es obligatoria");
        return;
      }

      if (formData.tipo_acceso !== "permanente" && !formData.fecha_fin) {
        toast.error(
          "La fecha de fin es obligatoria para códigos no permanentes"
        );
        return;
      }

      if (
        formData.fecha_fin &&
        new Date(formData.fecha_inicio) >= new Date(formData.fecha_fin)
      ) {
        toast.error("La fecha de fin debe ser posterior a la fecha de inicio");
        return;
      }

      // Preparar datos
      const dataToSend = {
        ...formData,
        usos_maximos: formData.usos_maximos
          ? parseInt(formData.usos_maximos)
          : null,
        fecha_fin:
          formData.tipo_acceso === "permanente" ? null : formData.fecha_fin,
        creado_por: parseInt(localStorage.getItem("userId")) || null,
      };

      let resultado;
      if (codigoAcceso) {
        resultado = await CodigoAccesoService.actualizarCodigoAcceso(
          codigoAcceso.id,
          dataToSend
        );
        toast.success("Código de acceso actualizado exitosamente");
      } else {
        resultado = await CodigoAccesoService.crearCodigoAcceso(dataToSend);
        setCodigoGenerado(resultado.codigo);
        toast.success("Código de acceso creado exitosamente");
      }

      refetch();

      // Si es nuevo código, mostrar el código generado
      if (!codigoAcceso) {
        // No cerrar el modal para que vea el código
      } else {
        setShow(false);
      }
    } catch (error) {
      console.error("Error al guardar código de acceso:", error);
      toast.error(error.message || "Error al guardar código de acceso");
    } finally {
      setLoading(false);
    }
  };

  // Si se generó un código nuevo, mostrar pantalla de éxito
  if (codigoGenerado) {
    return (
      <div className="codigo-generado-success">
        <div className="success-icon">✅</div>
        <h3>¡Código Generado Exitosamente!</h3>
        <div className="codigo-display">
          <code>{codigoGenerado}</code>
          <button
            type="button"
            className="btn-copy"
            onClick={() => copiarCodigo(codigoGenerado)}
          >
            <FontAwesomeIcon icon={faCopy} /> Copiar
          </button>
        </div>
        <p className="warning-text">
          ⚠️ Guarda este código en un lugar seguro. Será necesario para acceder
          al sistema.
        </p>
        <div className="codigo-info">
          <div className="info-item">
            <strong>Nombre:</strong> {formData.nombre}
          </div>
          <div className="info-item">
            <strong>Nivel de Acceso:</strong> {formData.nivel_acceso}
          </div>
          <div className="info-item">
            <strong>Tipo:</strong> {formData.tipo_acceso}
          </div>
        </div>
        <button
          type="button"
          className="btn-close-success"
          onClick={() => setShow(false)}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="codigo-acceso-modal">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Código (opcional)</label>
          <div className="input-with-button">
            <input
              type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              placeholder="Se generará automáticamente si no se especifica"
              maxLength={50}
            />
            <button
              type="button"
              className="btn-generate"
              onClick={generarCodigoAleatorio}
              title="Generar código aleatorio"
            >
              🎲
            </button>
          </div>
          <small>Deja vacío para generar automáticamente</small>
        </div>

        <div className="form-group">
          <label>
            Nombre <span className="required">*</span>
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej: Acceso Temporal Supervisor"
            required
          />
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            placeholder="Descripción del código de acceso..."
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              Tipo de Acceso <span className="required">*</span>
            </label>
            <select
              name="tipo_acceso"
              value={formData.tipo_acceso}
              onChange={handleChange}
              required
            >
              <option value="temporal">Temporal</option>
              <option value="permanente">Permanente</option>
              <option value="uso_unico">Uso Único</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Nivel de Acceso <span className="required">*</span>
            </label>
            <select
              name="nivel_acceso"
              value={formData.nivel_acceso}
              onChange={handleChange}
              required
            >
              <option value="invitado">Invitado (Solo Lectura)</option>
              <option value="vendedor">Vendedor</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>

        {formData.tipo_acceso !== "uso_unico" && (
          <div className="form-group">
            <label>Usos Máximos</label>
            <input
              type="number"
              name="usos_maximos"
              value={formData.usos_maximos}
              onChange={handleChange}
              placeholder="Ilimitado"
              min="1"
            />
            <small>Deja vacío para usos ilimitados</small>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>
              Fecha y Hora de Inicio <span className="required">*</span>
            </label>
            <input
              type="datetime-local"
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={handleChange}
              required
            />
          </div>

          {formData.tipo_acceso !== "permanente" && (
            <div className="form-group">
              <label>
                Fecha y Hora de Fin <span className="required">*</span>
              </label>
              <input
                type="datetime-local"
                name="fecha_fin"
                value={formData.fecha_fin}
                onChange={handleChange}
                min={formData.fecha_inicio}
                required
              />
            </div>
          )}
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            <span>Código activo</span>
          </label>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShow(false)}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faTimes} /> Cancelar
          </button>
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Guardando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />{" "}
                {codigoAcceso ? "Actualizar" : "Generar Código"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
