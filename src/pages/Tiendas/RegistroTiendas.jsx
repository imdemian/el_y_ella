import React, { useState } from "react";
import { actualizarTienda, crearTienda } from "../../services/tiendaService";
import { toast } from "react-toastify";

export default function RegistroTiendas({ tienda, setShow }) {
  const [form, setForm] = useState({
    nombre: tienda?.nombre || "",
    direccion: tienda?.direccion || "",
    telefono: tienda?.telefono || "",
    encargado: tienda?.encargado || "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (tienda?.id) await actualizarTienda(tienda.id, form);
      else await crearTienda(form);
      resetForm();
      toast.success("Tienda guardada correctamente");
      setShow(false);
    } catch (error) {
      console.error("Error al guardar tienda:", error);
      toast.error("No se pudo guardar la tienda");
    }
  };

  const resetForm = () => {
    setForm({ nombre: "", direccion: "", telefono: "", encargado: "" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row mb-3 align-items-center">
        <div className="col-md-2 d-flex align-items-center">
          <label htmlFor="nombre" className="form-label m-0">
            Nombre
          </label>
        </div>
        <div className="col-md-10">
          <input
            id="nombre"
            name="nombre"
            type="text"
            className="form-control"
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="row mb-3 align-items-center">
        <div className="col-md-2">
          <label htmlFor="direccion" className="form-label m-0">
            Dirección
          </label>
        </div>
        <div className="col-md-10">
          <textarea
            id="direccion"
            name="direccion"
            className="form-control"
            rows={3}
            value={form.direccion}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="row mb-3 align-items-center">
        <div className="col-md-2">
          <label htmlFor="telefono" className="form-label m-0">
            Teléfono
          </label>
        </div>
        <div className="col-md-10">
          <input
            id="telefono"
            name="telefono"
            type="text"
            className="form-control"
            value={form.telefono}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="row mb-3 align-items-center">
        <div className="col-md-2">
          <label htmlFor="encargado" className="form-label m-0">
            Encargado
          </label>
        </div>
        <div className="col-md-10">
          <input
            id="encargado"
            name="encargado"
            type="text"
            className="form-control"
            value={form.encargado}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <button type="submit" className="btn btn-primary w-100">
            {tienda ? "Actualizar" : "Registrar"}
          </button>
        </div>
      </div>
    </form>
  );
}
