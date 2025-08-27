import React, { useEffect, useState } from "react";
import {
  crearProducto,
  actualizarProducto,
} from "../../services/productoService";
import { obtenerCategorias } from "../../services/categoriaService";
import { toast } from "react-toastify";

// ---------- Utils ----------
const ATTR_EXCLUDE = new Set(["id", "sku", "barcode", "precio"]);

const keyOf = (combo) => {
  const attrs = Object.entries(combo)
    .filter(([k]) => !ATTR_EXCLUDE.has(k))
    .map(([k, v]) => [String(k), String(v)]);
  // ordena para tener una llave determinística
  attrs.sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(attrs);
};

const genId = () =>
  `VAR_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

// Genera un SKU legible a partir de nombre/categoría y atributos
const buildSku = (categoriaNombre, nombreProd, combo) => {
  const obj = Object.fromEntries(
    Object.entries(combo).filter(([k]) => !ATTR_EXCLUDE.has(k))
  );

  const colorKey = Object.keys(obj).find((k) => k.toLowerCase() === "color");
  const tallaKey = Object.keys(obj).find((k) => k.toLowerCase() === "talla");

  const cat = (categoriaNombre || "").toString().slice(0, 4).toUpperCase();
  const name = (nombreProd || "").trim().toUpperCase().replace(/\s+/g, "_");
  const color = colorKey ? String(obj[colorKey]).toUpperCase() : "";
  const talla = tallaKey ? `T${String(obj[tallaKey]).toUpperCase()}` : "";

  return [cat, name, color, talla]
    .filter(Boolean)
    .join("_")
    .replace(/_+/g, "_");
};

// Función para generar producto cartesiano de combinaciones
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
 * - IDs de variante ESTABLES
 * - SKU legible
 * - barcode por variante
 * - categoriaId + categoria (nombre)
 */
const RegistroProducto = ({ producto, setShow }) => {
  // Básicos
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState(""); // id
  const [categoria, setCategoria] = useState(""); // nombre
  const [precioBase, setPrecioBase] = useState("");
  const [imagenes, setImagenes] = useState([""]);

  // Variantes (definición) y combinaciones (instancias)
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
        setCategorias(cats || []);
      } catch {
        toast.error("Error al cargar categorías");
      }

      if (producto) {
        setNombre(producto.nombre || "");
        setDescripcion(producto.descripcion || "");
        // si backend guardó categoriaId y categoria (nombre)
        setCategoriaId(producto.categoriaId || "");
        setCategoria(producto.categoria || "");

        setPrecioBase(
          producto.precioBase != null ? String(producto.precioBase) : ""
        );
        setImagenes(producto.imagenes?.length ? producto.imagenes : [""]);

        if (producto.variantes?.length) {
          setTieneVariantes(true);

          // Reconstruye "schema" de atributos a partir de todas las variantes
          const schema = {};
          for (const v of producto.variantes) {
            Object.entries(v.atributos || {}).forEach(([k, val]) => {
              const key = String(k).trim();
              schema[key] = schema[key] || new Set();
              schema[key].add(String(val).trim());
            });
          }
          setVariantes(
            Object.entries(schema).map(([atributo, set]) => ({
              atributo,
              opciones: Array.from(set),
            }))
          );

          // Combos preservando id, precio, sku, barcode
          const initCombos = producto.variantes.map((v) => ({
            id: v.id, // estable
            ...v.atributos, // atributos (Color/Talla/etc.)
            precio: v.precio ?? producto.precioBase,
            sku: v.sku || "",
            barcode: v.barcode || "",
          }));
          setCombinaciones(initCombos);
        }
      }
    })();
  }, [producto]);

  // ---------- Handlers imágenes ----------
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

  // ---------- Handlers variantes (definición) ----------
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

  // ---------- Generar combos preservando IDs/valores previos ----------
  const handleGenerarCombos = () => {
    const base = parseFloat(precioBase) || 0;
    const raw = generarCombinaciones(variantes, base);

    // Indexa combos previos por su "key" (sin precio/id/sku/barcode)
    const prevByKey = new Map(combinaciones.map((c) => [keyOf(c), c]));

    const withId = raw.map((c) => {
      const k = keyOf(c);
      const prev = prevByKey.get(k);
      const next = {
        id: prev?.id || genId(), // ID estable
        ...c, // atributos + precio base por generarCombinaciones
        precio: prev?.precio ?? c.precio ?? base, // preserva precio si existía
        sku: buildSku(categoria, nombre, prev || c), // SKU legible
        barcode: prev?.barcode || "", // preserva barcode si existía
      };
      return next;
    });

    setCombinaciones(withId);
  };

  const handlePrecioComboChange = (idx, val) => {
    const arr = [...combinaciones];
    arr[idx].precio = parseFloat(val) || 0;
    setCombinaciones(arr);
  };

  const handleComboChange = (idx, patch) => {
    setCombinaciones((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], ...patch };
      return arr;
    });
  };

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !precioBase.trim() || !categoriaId) {
      toast.error("Completa Nombre, Precio y Categoría");
      return;
    }

    // Validación simple: combos duplicados por atributos
    const keys = new Set();
    for (const c of combinaciones) {
      const k = keyOf(c);
      if (keys.has(k)) {
        toast.error("Hay combinaciones duplicadas de variantes.");
        return;
      }
      keys.add(k);
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria, // nombre (para mostrar/búsquedas)
      categoriaId: categoriaId || null, // id (para relaciones)
      precioBase: parseFloat(precioBase),
      imagenes: imagenes.filter((u) => u.trim()),
      tieneVariantes,
      variantes: tieneVariantes
        ? combinaciones.map((c) => ({
            id: c.id, // estable
            sku: c.sku || null,
            barcode: c.barcode || null,
            precio: c.precio,
            atributos: Object.fromEntries(
              Object.entries(c).filter(([k]) => !ATTR_EXCLUDE.has(k))
            ),
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
      setShow(false);
    } catch (err) {
      console.error(err);
      toast.error("Error guardando producto");
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

        {/* Categoría (id + nombre) */}
        <div className="mb-3">
          <label className="form-label">Categoría *</label>
          <select
            className="form-select"
            value={categoriaId}
            onChange={(e) => {
              const id = e.target.value;
              setCategoriaId(id);
              const cat = categorias.find((c) => c.id === id);
              setCategoria(cat?.nombre || "");
            }}
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
              disabled={
                !precioBase ||
                !variantes.some(
                  (v) => v.atributo.trim() && v.opciones.some((o) => o.trim())
                )
              }
            >
              Generar Combinaciones
            </button>
          </div>
        )}

        {/* Tabla de combinaciones con edición de precio y barcode */}
        {tieneVariantes && combinaciones.length > 0 && (
          <div className="table-responsive mb-3">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  {/* Atributos dinámicos */}
                  {Object.keys(
                    Object.fromEntries(
                      Object.entries(combinaciones[0]).filter(
                        ([k]) => !ATTR_EXCLUDE.has(k)
                      )
                    )
                  ).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                  <th>SKU</th>
                  <th>Precio</th>
                  <th>Barcode</th>
                </tr>
              </thead>
              <tbody>
                {combinaciones.map((c, idx) => (
                  <tr key={c.id}>
                    {Object.entries(c)
                      .filter(([k]) => !ATTR_EXCLUDE.has(k))
                      .map(([k, v]) => (
                        <td key={k}>{String(v)}</td>
                      ))}
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={c.sku || ""}
                        onChange={(e) =>
                          handleComboChange(idx, { sku: e.target.value })
                        }
                      />
                    </td>
                    <td style={{ width: 140 }}>
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
                    <td style={{ width: 220 }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. CODE128"
                        value={c.barcode || ""}
                        onChange={(e) =>
                          handleComboChange(idx, { barcode: e.target.value })
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
