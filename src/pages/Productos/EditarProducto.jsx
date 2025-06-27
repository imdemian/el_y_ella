import React, { useEffect, useState } from "react";
import {
  crearProducto,
  actualizarProducto,
} from "../../services/productoService";
import { obtenerCategorias } from "../../services/categoriaService";
import { toast } from "react-toastify";

// Genera las combinaciones (producto cartesiano)
const generarCombinaciones = (variantes, precioBase) => {
  let combos = [{}];
  variantes.forEach(({ atributo, opciones }) => {
    if (!atributo.trim()) return;
    const tmp = [];
    combos.forEach((base) => {
      opciones
        .filter((o) => o.trim())
        .forEach((opcion) => {
          tmp.push({
            ...base,
            [atributo.trim()]: opcion.trim(),
            precio: precioBase,
          });
        });
    });
    combos = tmp;
  });
  return combos;
};

// Deriva definiciones de variantes a partir de combinaciones existentes
const derivarDefiniciones = (combinaciones) => {
  if (!combinaciones.length) return [{ atributo: "", opciones: [""] }];
  const atributos = Object.keys(combinaciones[0]).filter((k) => k !== "precio");
  return atributos.map((attr) => ({
    atributo: attr,
    opciones: [...new Set(combinaciones.map((c) => c[attr]))],
  }));
};

/**
 * Componente EditarProducto
 * @param {{ producto?: object, onSuccess?: () => void }} props
 */
const EditarProducto = ({ producto, onSuccess }) => {
  // Campos básicos
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [imagenes, setImagenes] = useState([""]);

  // Variantes y combinaciones
  const [tieneVariantes, setTieneVariantes] = useState(false);
  const [variantes, setVariantes] = useState([
    { atributo: "", opciones: [""] },
  ]);
  const [combinaciones, setCombinaciones] = useState([]);

  // Carga inicial
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        setCategorias(await obtenerCategorias());
      } catch {
        toast.error("Error al cargar categorías");
      }
    };
    fetchCategorias();

    if (producto) {
      // Prellenar campos básicos
      setNombre(producto.nombre || "");
      setDescripcion(producto.descripcion || "");
      setCategoria(producto.categoria || "");
      setPrecioBase(producto.precioBase?.toString() || "");
      setImagenes(producto.imagenes?.length ? producto.imagenes : [""]);

      // Si tiene variantes ya guardadas
      if (Array.isArray(producto.variantes) && producto.variantes.length) {
        // Construimos combinaciones a mostrar
        const combos = producto.variantes.map((v) => ({
          ...v.atributos,
          precio: v.precio,
        }));
        setCombinaciones(combos);
        // Derivar definiciones (atributo -> opciones)
        const defs = derivarDefiniciones(combos);
        setVariantes(defs);
        setTieneVariantes(true);
      }
    }
  }, [producto]);

  // Imágenes handlers
  const handleImagenChange = (idx, value) => {
    const arr = [...imagenes];
    arr[idx] = value;
    setImagenes(arr);
  };
  const addImagen = () => setImagenes([...imagenes, ""]);
  const removeImagen = (idx) => {
    const arr = imagenes.filter((_, i) => i !== idx);
    setImagenes(arr.length ? arr : [""]);
  };

  // Variantes handlers
  const handleAtributoChange = (vIdx, value) => {
    const arr = [...variantes];
    arr[vIdx].atributo = value;
    setVariantes(arr);
  };
  const handleOpcionChange = (vIdx, oIdx, value) => {
    const arr = [...variantes];
    arr[vIdx].opciones[oIdx] = value;
    setVariantes(arr);
  };
  const addOpcion = (vIdx) => {
    const arr = [...variantes];
    arr[vIdx].opciones.push("");
    setVariantes(arr);
  };
  const removeOpcion = (vIdx, oIdx) => {
    const arr = [...variantes];
    arr[vIdx].opciones = arr[vIdx].opciones.filter((_, i) => i !== oIdx);
    if (!arr[vIdx].opciones.length) arr[vIdx].opciones = [""];
    setVariantes(arr);
  };
  const addVariante = () =>
    setVariantes([...variantes, { atributo: "", opciones: [""] }]);
  const removeVariante = (vIdx) => {
    const arr = variantes.filter((_, i) => i !== vIdx);
    setVariantes(arr.length ? arr : [{ atributo: "", opciones: [""] }]);
  };

  // Generar y editar combinaciones
  const handleGenerarCombos = () => {
    const base = parseFloat(precioBase) || 0;
    const combos = generarCombinaciones(variantes, base);
    setCombinaciones(combos);
  };
  const handlePrecioComboChange = (idx, value) => {
    const arr = [...combinaciones];
    arr[idx].precio = parseFloat(value) || 0;
    setCombinaciones(arr);
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !precioBase.trim() || !categoria) {
      toast.error("Completa Nombre, Precio y Categoría");
      return;
    }
    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria,
      precioBase: parseFloat(precioBase),
      imagenes: imagenes.filter((u) => u.trim()),
      tieneVariantes,
      variantes: tieneVariantes
        ? combinaciones.map((c) => ({
            atributos: Object.keys(c)
              .filter((k) => k !== "precio")
              .reduce((o, k) => ({ ...o, [k]: c[k] }), {}),
            precio: c.precio,
          }))
        : [],
    };
    try {
      if (producto?.id) {
        await actualizarProducto(producto.id, payload);
        toast.success("Producto actualizado");
      } else {
        await crearProducto(payload);
        toast.success("Producto creado");
      }
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error("Error guardando producto");
    }
  };

  return (
    <div className="container mt-4">
      <h2>{producto?.id ? "Editar Producto" : "Registrar Producto"}</h2>
      <form onSubmit={handleSubmit}>
        {/* Nombre */}
        <div className="mb-3">
          <label className="form-label">Nombre *</label>
          <input
            type="text"
            className="form-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        {/* Descripción */}
        <div className="mb-3">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
          />
        </div>
        {/* Categoría */}
        <div className="mb-3">
          <label className="form-label">Categoría *</label>
          <select
            className="form-select"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
          >
            <option value="">— Selecciona —</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>
        {/* Precio Base */}
        <div className="mb-3">
          <label className="form-label">Precio Base *</label>
          <input
            type="number"
            className="form-control"
            value={precioBase}
            onChange={(e) => setPrecioBase(e.target.value)}
            step="0.01"
            min="0"
            required
          />
        </div>
        {/* Imágenes */}
        <div className="mb-3">
          <label className="form-label">Imágenes</label>
          {imagenes.map((url, idx) => (
            <div key={idx} className="input-group mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="URL imagen"
                value={url}
                onChange={(e) => handleImagenChange(idx, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => removeImagen(idx)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={addImagen}
          >
            + Imagen
          </button>
        </div>
        {/* Variantes */}
        <div className="form-check mb-3">
          <input
            id="hasVariants"
            type="checkbox"
            className="form-check-input"
            checked={tieneVariantes}
            onChange={(e) => setTieneVariantes(e.target.checked)}
          />
          <label htmlFor="hasVariants" className="form-check-label">
            ¿Tiene variantes?
          </label>
        </div>
        {tieneVariantes && (
          <div className="mb-3 border p-3 rounded">
            <h5 className="mb-3">Variantes</h5>
            {variantes.map((v, i) => (
              <div key={i} className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong>Variante {i + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeVariante(i)}
                  >
                    Eliminar
                  </button>
                </div>
                <input
                  type="text"
                  className="form-control mb-1"
                  placeholder="Atributo (ej. Color)"
                  value={v.atributo}
                  onChange={(e) => handleAtributoChange(i, e.target.value)}
                />
                {v.opciones.map((op, j) => (
                  <div key={j} className="input-group mb-1">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Opción (ej. Rojo)"
                      value={op}
                      onChange={(e) => handleOpcionChange(i, j, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => removeOpcion(i, j)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary me-2"
                  onClick={() => addOpcion(i)}
                >
                  + Opción
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={addVariante}
                >
                  + Agregar Variante
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary mt-2"
              onClick={handleGenerarCombos}
            >
              Generar Combinaciones
            </button>
          </div>
        )}
        {/* Tabla combinaciones */}
        {combinaciones.length > 0 && (
          <div className="table-responsive mb-3">
            <table className="table table-bordered">
              <thead>
                <tr>
                  {Object.keys(combinaciones[0])
                    .filter((k) => k !== "precio")
                    .map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {combinaciones.map((c, idx) => (
                  <tr key={idx}>
                    {Object.entries(c).map(
                      ([k, v]) => k !== "precio" && <td key={k}>{v}</td>
                    )}
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={c.precio}
                        step="0.01"
                        min="0"
                        onChange={(e) =>
                          handlePrecioComboChange(idx, e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="submit" className="btn btn-primary w-100">
          {producto?.id ? "Actualizar Producto" : "Guardar Producto"}
        </button>
      </form>
    </div>
  );
};

export default EditarProducto;
