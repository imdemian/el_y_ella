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
 * @param {{ producto?: object, onSuccess?: () => void, setShow: (b: boolean) => void }} props
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

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const cats = await obtenerCategorias();
        setCategorias(cats);
      } catch {
        toast.error("Error al cargar categorías");
      }

      if (producto) {
        setNombre(producto.nombre || "");
        setDescripcion(producto.descripcion || "");
        setCategoria(producto.categoria || "");
        setPrecioBase(producto.precioBase?.toString() || "");
        setImagenes(producto.imagenes?.length ? producto.imagenes : [""]);

        if (producto.variantes?.length) {
          setTieneVariantes(true);
          setVariantes(
            producto.variantes.map((v) => ({
              atributo: v.atributos ? Object.keys(v.atributos)[0] : "",
              opciones: v.atributos ? [Object.values(v.atributos)[0]] : [""],
            }))
          );
          // Generar combos iniciales con IDs
          const initCombos = generarCombinaciones(
            producto.variantes.map((v) => ({
              atributo: Object.keys(v.atributos)[0],
              opciones: [Object.values(v.atributos)[0]],
            })),
            producto.precioBase
          ).map((c) => generateVariantId(c, producto));
          setCombinaciones(initCombos);
        }
      }
    })();
  }, [producto]);

  // Generador de ID según formato
  const generateVariantId = (combo, prod) => {
    const catCode = prod.categoria.trim().substring(0, 4).toUpperCase();
    const nameCode = prod.nombre.trim().toUpperCase().replace(/\s+/g, "_");
    const colorKey = Object.keys(combo).find(
      (k) => k.toLowerCase() === "color"
    );
    const sizeKey = Object.keys(combo).find((k) => k.toLowerCase() === "talla");
    const color = colorKey ? combo[colorKey].toUpperCase() : "";
    const size = sizeKey ? `T${combo[sizeKey].toUpperCase()}` : "";
    return `${catCode}_${nameCode}_${color}_${size}`;
  };

  // Handlers imagenes
  const handleImagenChange = (i, val) => {
    const arr = [...imagenes];
    arr[i] = val;
    setImagenes(arr);
  };
  const addImagen = () => setImagenes([...imagenes, ""]);
  const removeImagen = (i) => {
    const arr = imagenes.filter((_, idx) => idx !== i);
    setImagenes(arr.length ? arr : [""]);
  };

  // Handlers variantes
  const handleAtributoChange = (i, val) => {
    const arr = [...variantes];
    arr[i].atributo = val;
    setVariantes(arr);
  };
  const handleOpcionChange = (i, j, val) => {
    const arr = [...variantes];
    arr[i].opciones[j] = val;
    setVariantes(arr);
  };
  const addOpcion = (i) => {
    const arr = [...variantes];
    arr[i].opciones.push("");
    setVariantes(arr);
  };
  const removeOpcion = (i, j) => {
    const arr = [...variantes];
    arr[i].opciones = arr[i].opciones.filter((_, idx) => idx !== j);
    if (!arr[i].opciones.length) arr[i].opciones = [""];
    setVariantes(arr);
  };
  const addVariante = () =>
    setVariantes([...variantes, { atributo: "", opciones: [""] }]);
  const removeVariante = (i) => {
    const arr = variantes.filter((_, idx) => idx !== i);
    setVariantes(arr.length ? arr : [{ atributo: "", opciones: [""] }]);
  };

  // Generar combos y asignar ID
  const handleGenerarCombos = () => {
    const base = parseFloat(precioBase) || 0;
    const raw = generarCombinaciones(variantes, base);
    const withId = raw.map((c) => ({
      id: generateVariantId(c, { nombre, categoria }),
      ...c,
    }));
    setCombinaciones(withId);
  };

  const handlePrecioComboChange = (idx, val) => {
    const arr = [...combinaciones];
    arr[idx].precio = parseFloat(val) || 0;
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
              .filter((k) => "precio" !== k)
              .reduce((o, k) => ({ ...o, [k]: c[k] }), {}),
            precio: c.precio,
            id: c.id,
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
