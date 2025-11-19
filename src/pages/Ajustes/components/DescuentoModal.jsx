// src/pages/Ajustes/components/DescuentoModal.jsx
import React, { useState, useEffect } from "react";
import { DescuentoService } from "../../../services/supabase/descuentoService";
import { CategoriaService } from "../../../services/supabase/categoriaService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import "./DescuentoModal.scss";

export default function DescuentoModal({ descuento, setShow, refetch }) {
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    tipo_descuento: "porcentaje",
    valor: "",
    monto_minimo: 0,
    monto_maximo: "",
    usos_maximos: "",
    usos_por_cliente: 1,
    fecha_inicio: new Date().toISOString().slice(0, 16),
    fecha_fin: "",
    aplica_a: "todo",
    referencia_ids: [],
    activo: true,
  });

  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  useEffect(() => {
    if (descuento) {
      setFormData({
        codigo: descuento.codigo || "",
        nombre: descuento.nombre || "",
        descripcion: descuento.descripcion || "",
        tipo_descuento: descuento.tipo_descuento || "porcentaje",
        valor: descuento.valor || "",
        monto_minimo: descuento.monto_minimo || 0,
        monto_maximo: descuento.monto_maximo || "",
        usos_maximos: descuento.usos_maximos || "",
        usos_por_cliente: descuento.usos_por_cliente || 1,
        fecha_inicio: descuento.fecha_inicio
          ? new Date(descuento.fecha_inicio).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        fecha_fin: descuento.fecha_fin
          ? new Date(descuento.fecha_fin).toISOString().slice(0, 16)
          : "",
        aplica_a: descuento.aplica_a || "todo",
        referencia_ids: descuento.referencia_ids || [],
        activo: descuento.activo !== undefined ? descuento.activo : true,
      });
    }
  }, [descuento]);

  useEffect(() => {
    if (formData.aplica_a === "categoria") {
      cargarCategorias();
    }
  }, [formData.aplica_a]);

  const cargarCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const data = await CategoriaService.obtenerCategorias();
      setCategorias(data);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      toast.error("Error al cargar categorías");
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCategoriaToggle = (categoriaId) => {
    setFormData((prev) => {
      const referencia_ids = prev.referencia_ids.includes(categoriaId)
        ? prev.referencia_ids.filter((id) => id !== categoriaId)
        : [...prev.referencia_ids, categoriaId];
      return { ...prev, referencia_ids };
    });
  };

  const generarCodigoAleatorio = () => {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let codigo = "";
    for (let i = 0; i < 8; i++) {
      codigo += caracteres.charAt(
        Math.floor(Math.random() * caracteres.length)
      );
    }
    setFormData((prev) => ({ ...prev, codigo }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones
      if (!formData.codigo.trim()) {
        toast.error("El código es obligatorio");
        return;
      }

      if (!formData.nombre.trim()) {
        toast.error("El nombre es obligatorio");
        return;
      }

      if (!formData.valor || formData.valor <= 0) {
        toast.error("El valor debe ser mayor a 0");
        return;
      }

      if (formData.tipo_descuento === "porcentaje" && formData.valor > 100) {
        toast.error("El porcentaje no puede ser mayor a 100%");
        return;
      }

      if (!formData.fecha_inicio || !formData.fecha_fin) {
        toast.error("Las fechas de inicio y fin son obligatorias");
        return;
      }

      if (new Date(formData.fecha_inicio) >= new Date(formData.fecha_fin)) {
        toast.error("La fecha de fin debe ser posterior a la fecha de inicio");
        return;
      }

      // Preparar datos
      const dataToSend = {
        ...formData,
        valor: parseFloat(formData.valor),
        monto_minimo: parseFloat(formData.monto_minimo) || 0,
        monto_maximo: formData.monto_maximo
          ? parseFloat(formData.monto_maximo)
          : null,
        usos_maximos: formData.usos_maximos
          ? parseInt(formData.usos_maximos)
          : null,
        usos_por_cliente: parseInt(formData.usos_por_cliente) || 1,
        referencia_ids:
          formData.aplica_a !== "todo" ? formData.referencia_ids : null,
      };

      if (descuento) {
        await DescuentoService.actualizarDescuento(descuento.id, dataToSend);
        toast.success("Descuento actualizado exitosamente");
      } else {
        await DescuentoService.crearDescuento(dataToSend);
        toast.success("Descuento creado exitosamente");
      }

      refetch();
      setShow(false);
    } catch (error) {
      console.error("Error al guardar descuento:", error);
      toast.error(error.message || "Error al guardar descuento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="descuento-modal">
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>
              Código <span className="required">*</span>
            </label>
            <div className="input-with-button">
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="Ej: VERANO2025"
                required
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
            <small>El código se convertirá automáticamente a mayúsculas</small>
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
              placeholder="Ej: Descuento de Verano"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            placeholder="Descripción del descuento..."
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              Tipo de Descuento <span className="required">*</span>
            </label>
            <select
              name="tipo_descuento"
              value={formData.tipo_descuento}
              onChange={handleChange}
              required
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="fijo">Monto Fijo ($)</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              Valor <span className="required">*</span>
            </label>
            <input
              type="number"
              name="valor"
              value={formData.valor}
              onChange={handleChange}
              placeholder={
                formData.tipo_descuento === "porcentaje" ? "Ej: 10" : "Ej: 200"
              }
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Compra Mínima ($)</label>
            <input
              type="number"
              name="monto_minimo"
              value={formData.monto_minimo}
              onChange={handleChange}
              placeholder="0"
              step="0.01"
              min="0"
            />
          </div>

          {formData.tipo_descuento === "porcentaje" && (
            <div className="form-group">
              <label>Descuento Máximo ($)</label>
              <input
                type="number"
                name="monto_maximo"
                value={formData.monto_maximo}
                onChange={handleChange}
                placeholder="Sin límite"
                step="0.01"
                min="0"
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Usos Máximos (Total)</label>
            <input
              type="number"
              name="usos_maximos"
              value={formData.usos_maximos}
              onChange={handleChange}
              placeholder="Ilimitado"
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Usos por Cliente</label>
            <input
              type="number"
              name="usos_por_cliente"
              value={formData.usos_por_cliente}
              onChange={handleChange}
              placeholder="1"
              min="1"
            />
          </div>
        </div>

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
        </div>

        <div className="form-group">
          <label>
            Aplica a <span className="required">*</span>
          </label>
          <select
            name="aplica_a"
            value={formData.aplica_a}
            onChange={handleChange}
            required
          >
            <option value="todo">Todos los productos</option>
            <option value="categoria">Categorías específicas</option>
            <option value="producto">Productos específicos</option>
          </select>
        </div>

        {formData.aplica_a === "categoria" && (
          <div className="form-group">
            <label>Seleccionar Categorías</label>
            {loadingCategorias ? (
              <div className="loading-small">
                <FontAwesomeIcon icon={faSpinner} spin /> Cargando categorías...
              </div>
            ) : (
              <div className="checkbox-list">
                {categorias.map((categoria) => (
                  <label key={categoria.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.referencia_ids.includes(categoria.id)}
                      onChange={() => handleCategoriaToggle(categoria.id)}
                    />
                    <span>{categoria.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            <span>Descuento activo</span>
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
                {descuento ? "Actualizar" : "Crear"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
