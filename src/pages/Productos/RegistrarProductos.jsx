import React, { useEffect, useState } from "react";
import {
  crearProducto,
  actualizarProducto,
} from "../../services/productoService";
import { obtenerCategorias } from "../../services/categoriaService";
import { toast } from "react-toastify";

// Función para generar combinaciones (producto cartesiano)
const generarCombinaciones = (variantes, precioBase) => {
  let combos = [{}];
  variantes.forEach(({ atributo, opciones }) => {
    if (!atributo.trim()) return;
    const tmp = [];
    combos.forEach((base) => {
      opciones
        .filter((o) => o.trim())
        .forEach((op) => {
          tmp.push({
            ...base,
            [atributo.trim()]: op.trim(),
            precio: precioBase,
          });
        });
    });
    combos = tmp;
  });
  return combos;
};

/**
 * Componente RegistroProducto
 * @param {{ producto?: object, onSuccess?: () => void }} props
 */
const RegistroProducto = ({ producto, setShow }) => {
  // Campos básicos
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [imagenes, setImagenes] = useState([""]);

  // Variantes
  const [tieneVariantes, setTieneVariantes] = useState(false);
  const [variantes, setVariantes] = useState([
    { atributo: "", opciones: [""] },
  ]);
  const [combinaciones, setCombinaciones] = useState([]);

  // Carga inicial de categorías y datos para edición
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await obtenerCategorias();
        setCategorias(cats);
      } catch {
        toast.error("Error al cargar categorías");
      }
    };
    fetchCategorias();

    if (producto) {
      // Prellenar campos
      setNombre(producto.nombre || "");
      setDescripcion(producto.descripcion || "");
      setCategoria(producto.categoria || "");
      setPrecioBase(producto.precioBase?.toString() || "");
      setImagenes(producto.imagenes?.length ? producto.imagenes : [""]);

      if (Array.isArray(producto.variantes) && producto.variantes.length) {
        setTieneVariantes(true);
        setVariantes(
          producto.variantes.map((v) => ({
            atributo: v.atributo || "",
            opciones:
              Array.isArray(v.opciones) && v.opciones.length
                ? v.opciones
                : [""],
          }))
        );
      }
    }
  }, [producto]);

  // Handlers para imágenes
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

  // Handlers para variantes
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

  // Generar combinaciones y permitir editar precio
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
      tieneVariantes: tieneVariantes,
      variantes: tieneVariantes
        ? combinaciones.map((c) => ({
            atributos: Object.keys(c)
              .filter((k) => k !== "precio")
              .reduce((obj, k) => {
                obj[k] = c[k];
                return obj;
              }, {}),
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
    } catch (err) {
      console.error(err);
      toast.error("Error guardando producto");
    } finally {
      setShow(false);
    }
  };

  return (
    <div className="container ">
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
                className="btn btn-outline-danger"
                type="button"
                onClick={() => removeImagen(idx)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="btn btn-sm btn-outline-secondary"
            type="button"
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
              <div key={i} className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <strong>Variante {i + 1}</strong>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    onClick={() => removeVariante(i)}
                  >
                    Eliminar
                  </button>
                </div>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Atributo (ej. Color)"
                  value={v.atributo}
                  onChange={(e) => handleAtributoChange(i, e.target.value)}
                />
                {v.opciones.map((op, j) => (
                  <div key={j} className="input-group mb-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Opción (ej. Rojo)"
                      value={op}
                      onChange={(e) => handleOpcionChange(i, j, e.target.value)}
                    />
                    <button
                      className="btn btn-outline-danger"
                      type="button"
                      onClick={() => removeOpcion(i, j)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-sm btn-outline-secondary me-2"
                  type="button"
                  onClick={() => addOpcion(i)}
                >
                  + Opción
                </button>
              </div>
            ))}
            <button
              className="btn btn-sm btn-outline-primary me-2"
              type="button"
              onClick={addVariante}
            >
              + Agregar Variante
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleGenerarCombos}
            >
              Generar Combinaciones
            </button>
          </div>
        )}
        {/* Tabla de combinaciones con edición de precio */}
        {combinaciones.length > 0 && (
          <div className="table-responsive mb-3">
            <table className="table table-bordered">
              <thead>
                <tr>
                  {Object.keys(combinaciones[0])
                    .filter((k) => "precio" !== k)
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
        {/* Botón guardar */}
        <button type="submit" className="btn btn-primary w-100">
          {producto?.id ? "Actualizar Producto" : "Guardar Producto"}
        </button>
      </form>
    </div>
  );
};

export default RegistroProducto;
