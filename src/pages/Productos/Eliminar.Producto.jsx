// src/pages/Productos/Eliminar.Producto.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import { eliminarProducto } from "../../services/productoService";

export default function EliminarProducto({ producto, setShow }) {
  // Inicializamos los datos del producto que se mostrarán (campos deshabilitados)
  const [formData, setFormData] = useState({
    nombre: producto?.nombre || "",
    descripcion: producto?.descripcion || "",
    precio: producto?.precioBase || "",
    categoria: producto?.categoria || "",
    imagen: producto?.imagen || "",
  });

  const handleDelete = async (e) => {
    e.preventDefault();
    try {
      const response = await eliminarProducto(producto.id);
      if (response) {
        toast.success("Producto eliminado con éxito");
        setFormData({
          nombre: "",
          descripcion: "",
          precio: "",
          categoria: "",
          imagen: "",
        });
      }
      setShow(false);
    } catch (error) {
      toast.error("Error al eliminar el producto, " + error.message);
    }
  };

  return (
    <div>
      <h2>Eliminar Producto</h2>
      <form>
        <label htmlFor="" className="form-label">
          Nombre
        </label>
        <input
          type="text"
          value={formData.nombre}
          className="form-control"
          disabled
        />
        <label htmlFor="" className="form-label">
          Descripción
        </label>
        <input
          type="text"
          value={formData.descripcion}
          className="form-control"
          disabled
        />
        <label htmlFor="" className="form-label">
          Precio
        </label>
        <input
          type="text"
          value={formData.precio}
          className="form-control"
          disabled
        />
        <label htmlFor="" className="form-label">
          Categoría
        </label>
        <input
          type="text"
          value={formData.categoria}
          className="form-control"
          disabled
        />

        <button
          type="button"
          className="mt-2 btn btn-danger"
          onClick={handleDelete}
        >
          Eliminar
        </button>
      </form>
    </div>
  );
}
