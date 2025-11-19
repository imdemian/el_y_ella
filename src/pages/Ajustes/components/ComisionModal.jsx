// src/pages/Ajustes/components/ComisionModal.jsx
import React, { useState, useEffect } from "react";
import { ComisionService } from "../../../services/supabase/comisionService";
import { EmpleadoService } from "../../../services/supabase/empleadoService";
import { CategoriaService } from "../../../services/supabase/categoriaService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import "./ComisionModal.scss";

export default function ComisionModal({ comision, setShow, refetch }) {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo_comision: "porcentaje",
    valor: "",
    aplica_a: "todos",
    referencia_id: null,
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
    activo: true,
  });

  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loadingReferencias, setLoadingReferencias] = useState(false);

  useEffect(() => {
    if (comision) {
      setFormData({
        nombre: comision.nombre || "",
        descripcion: comision.descripcion || "",
        tipo_comision: comision.tipo_comision || "porcentaje",
        valor: comision.valor || "",
        aplica_a: comision.aplica_a || "todos",
        referencia_id: comision.referencia_id || null,
        fecha_inicio:
          comision.fecha_inicio || new Date().toISOString().split("T")[0],
        fecha_fin: comision.fecha_fin || "",
        activo: comision.activo !== undefined ? comision.activo : true,
      });
    }
  }, [comision]);

  // Cargar empleados o categorías según la selección
  useEffect(() => {
    if (formData.aplica_a === "empleado") {
      cargarEmpleados();
    } else if (formData.aplica_a === "categoria") {
      cargarCategorias();
    }
  }, [formData.aplica_a]);

  const cargarEmpleados = async () => {
    setLoadingReferencias(true);
    try {
      const data = await EmpleadoService.obtenerEmpleados();
      setEmpleados(data);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
      toast.error("Error al cargar empleados");
    } finally {
      setLoadingReferencias(false);
    }
  };

  const cargarCategorias = async () => {
    setLoadingReferencias(true);
    try {
      const data = await CategoriaService.obtenerCategorias();
      setCategorias(data);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      toast.error("Error al cargar categorías");
    } finally {
      setLoadingReferencias(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

      if (!formData.valor || formData.valor <= 0) {
        toast.error("El valor debe ser mayor a 0");
        return;
      }

      if (formData.tipo_comision === "porcentaje" && formData.valor > 100) {
        toast.error("El porcentaje no puede ser mayor a 100%");
        return;
      }

      if (
        (formData.aplica_a === "empleado" ||
          formData.aplica_a === "categoria" ||
          formData.aplica_a === "producto") &&
        !formData.referencia_id
      ) {
        toast.error("Debes seleccionar una referencia");
        return;
      }

      // Preparar datos
      const dataToSend = {
        ...formData,
        valor: parseFloat(formData.valor),
        referencia_id:
          formData.aplica_a === "todos" ? null : formData.referencia_id,
        fecha_fin: formData.fecha_fin || null,
      };

      if (comision) {
        await ComisionService.actualizarComision(comision.id, dataToSend);
        toast.success("Comisión actualizada exitosamente");
      } else {
        await ComisionService.crearComision(dataToSend);
        toast.success("Comisión creada exitosamente");
      }

      refetch();
      setShow(false);
    } catch (error) {
      console.error("Error al guardar comisión:", error);
      toast.error(error.message || "Error al guardar comisión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comision-modal">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            Nombre <span className="required">*</span>
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej: Comisión por venta"
            required
          />
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            placeholder="Descripción de la comisión..."
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              Tipo de Comisión <span className="required">*</span>
            </label>
            <select
              name="tipo_comision"
              value={formData.tipo_comision}
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
                formData.tipo_comision === "porcentaje"
                  ? "Ej: 5 (para 5%)"
                  : "Ej: 100"
              }
              step="0.01"
              min="0"
              required
            />
            <small>
              {formData.tipo_comision === "porcentaje"
                ? "Ingresa el porcentaje (ej: 5 para 5%)"
                : "Ingresa el monto fijo en pesos"}
            </small>
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
            <option value="todos">Todos los vendedores</option>
            <option value="empleado">Empleado específico</option>
            <option value="categoria">Categoría de productos</option>
            <option value="producto">Producto específico</option>
          </select>
        </div>

        {/* Selector de referencia según el tipo */}
        {formData.aplica_a === "empleado" && (
          <div className="form-group">
            <label>
              Seleccionar Empleado <span className="required">*</span>
            </label>
            {loadingReferencias ? (
              <div className="loading-small">
                <FontAwesomeIcon icon={faSpinner} spin /> Cargando empleados...
              </div>
            ) : (
              <select
                name="referencia_id"
                value={formData.referencia_id || ""}
                onChange={handleChange}
                required
              >
                <option value="">Selecciona un empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.usuario_id} value={empleado.usuario_id}>
                    {empleado.nombre} - {empleado.rol}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {formData.aplica_a === "categoria" && (
          <div className="form-group">
            <label>
              Seleccionar Categoría <span className="required">*</span>
            </label>
            {loadingReferencias ? (
              <div className="loading-small">
                <FontAwesomeIcon icon={faSpinner} spin /> Cargando categorías...
              </div>
            ) : (
              <select
                name="referencia_id"
                value={formData.referencia_id || ""}
                onChange={handleChange}
                required
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {formData.aplica_a === "producto" && (
          <div className="form-group">
            <label>ID del Producto</label>
            <input
              type="number"
              name="referencia_id"
              value={formData.referencia_id || ""}
              onChange={handleChange}
              placeholder="Ingresa el ID del producto"
              required
            />
            <small>Próximamente podrás buscar productos desde una lista</small>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>
              Fecha Inicio <span className="required">*</span>
            </label>
            <input
              type="date"
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Fecha Fin (opcional)</label>
            <input
              type="date"
              name="fecha_fin"
              value={formData.fecha_fin}
              onChange={handleChange}
              min={formData.fecha_inicio}
            />
            <small>Déjalo vacío para comisión sin fecha de fin</small>
          </div>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            <span>Comisión activa</span>
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
                {comision ? "Actualizar" : "Crear"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
