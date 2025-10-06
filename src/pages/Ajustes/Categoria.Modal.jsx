// src/pages/Ajustes/Categoria.Modal.jsx
import React, { useState, useEffect } from "react";
import { CategoriaService } from "../../services/supabase/categoriaService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLayerGroup,
  faFileAlt,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import "./Categoria.Modal.scss";

export default function CategoriaModal({ categoria, setShow, refetch }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categoria) {
      setNombre(categoria.nombre || "");
      setDescripcion(categoria.descripcion || "");
    }
  }, [categoria]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
    };

    setLoading(true);
    try {
      if (categoria?.id) {
        // Actualizar
        await CategoriaService.actualizarCategoria(categoria.id, payload);
        toast.success("✅ Categoría actualizada exitosamente");
      } else {
        // Crear
        await CategoriaService.crearCategoria(payload);
        toast.success("✅ Categoría creada exitosamente");
      }

      if (refetch) await refetch();
      setShow(false);
    } catch (err) {
      console.error("Error guardando categoría:", err);
      toast.error(err.message || "Error al guardar la categoría");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="categoria-modal">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faLayerGroup} />
            </span>
            Nombre de la Categoría <span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Vestidos, Pantalones, Accesorios..."
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faFileAlt} />
            </span>
            Descripción
          </label>
          <textarea
            className="form-control"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción opcional de la categoría..."
            rows={3}
          />
        </div>

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
            {loading && (
              <FontAwesomeIcon icon={faSpinner} spin className="spinner" />
            )}
            {categoria?.id ? "Actualizar Categoría" : "Crear Categoría"}
          </button>
        </div>
      </form>
    </div>
  );
}
