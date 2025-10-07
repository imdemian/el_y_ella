// src/pages/Productos/RegistrarProductos.jsx
import React, { useEffect, useState } from "react";
import { ProductoService } from "../../services/supabase/productoService";
import { CategoriaService } from "../../services/supabase/categoriaService";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faFileAlt,
  faLayerGroup,
  faDollarSign,
  faSpinner,
  faCog,
  faTrash,
  faBarcode,
  faTags,
  faMagic,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import "./RegistrarProductos.scss";

// Catálogo de tallas y colores predefinidos
const TALLAS_DISPONIBLES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORES_DISPONIBLES = [
  "Negro",
  "Blanco",
  "Azul",
  "Rojo",
  "Verde",
  "Amarillo",
  "Rosa",
  "Gris",
  "Café",
  "Morado",
];

const RegistroProducto = ({ producto, setShow, refetch }) => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [marca, setMarca] = useState("");
  const [loading, setLoading] = useState(false);
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState([]);
  const [coloresSeleccionados, setColoresSeleccionados] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [costoVariante, setCostoVariante] = useState("");

  useEffect(() => {
    let mounted = true;
    const cargarDatos = async () => {
      try {
        const categoriasData = await CategoriaService.obtenerCategorias();
        if (mounted) {
          setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        }
        if (producto) {
          setNombre(producto.nombre || "");
          setDescripcion(producto.descripcion || "");
          setCategoriaId(producto.categoria_id || "");
          setPrecioBase(
            producto.precio_base != null ? String(producto.precio_base) : ""
          );
          setMarca(producto.marca || "");

          // Cargar variantes existentes si está en modo edición
          if (
            producto.variantes_producto &&
            producto.variantes_producto.length > 0
          ) {
            const tallasExistentes = new Set();
            const coloresExistentes = new Set();

            const variantesCargadas = producto.variantes_producto.map(
              (v, index) => ({
                id: v.id || "loaded-" + index,
                sku: v.sku,
                atributos: v.atributos || {},
                precio: String(v.precio || producto.precio_base || ""),
                costo: v.costo ? String(v.costo) : "",
                activo: v.activo !== false,
              })
            );

            // Extraer tallas y colores únicos de las variantes
            producto.variantes_producto.forEach((v) => {
              if (v.atributos?.talla) {
                tallasExistentes.add(v.atributos.talla);
              }
              if (v.atributos?.color) {
                coloresExistentes.add(v.atributos.color);
              }
            });

            setVariantes(variantesCargadas);
            setTallasSeleccionadas(Array.from(tallasExistentes));
            setColoresSeleccionados(Array.from(coloresExistentes));
          }
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar datos iniciales");
      }
    };
    cargarDatos();
    return () => {
      mounted = false;
    };
  }, [producto]);

  const generarVariantes = () => {
    if (tallasSeleccionadas.length === 0 && coloresSeleccionados.length === 0) {
      toast.warning("Selecciona al menos una talla o un color");
      return;
    }
    if (!precioBase || parseFloat(precioBase) <= 0) {
      toast.error("Ingresa un precio base válido primero");
      return;
    }
    const nuevasVariantes = [];
    const prefijo = nombre ? nombre.substring(0, 3).toUpperCase() : "PRO";

    if (tallasSeleccionadas.length > 0 && coloresSeleccionados.length === 0) {
      tallasSeleccionadas.forEach((talla, index) => {
        nuevasVariantes.push({
          id: "temp-" + Date.now() + "-" + index,
          sku:
            prefijo +
            "-" +
            String(index + 1).padStart(3, "0") +
            "-" +
            talla.toUpperCase(),
          atributos: { talla: talla },
          precio: precioBase,
          costo: costoVariante || "",
          activo: true,
        });
      });
    } else if (
      coloresSeleccionados.length > 0 &&
      tallasSeleccionadas.length === 0
    ) {
      coloresSeleccionados.forEach((color, index) => {
        nuevasVariantes.push({
          id: "temp-" + Date.now() + "-" + index,
          sku:
            prefijo +
            "-" +
            String(index + 1).padStart(3, "0") +
            "-" +
            color.substring(0, 2).toUpperCase(),
          atributos: { color: color },
          precio: precioBase,
          costo: costoVariante || "",
          activo: true,
        });
      });
    } else {
      let contador = 1;
      tallasSeleccionadas.forEach((talla) => {
        coloresSeleccionados.forEach((color) => {
          nuevasVariantes.push({
            id: "temp-" + Date.now() + "-" + contador,
            sku:
              prefijo +
              "-" +
              String(contador).padStart(3, "0") +
              "-" +
              talla.toUpperCase() +
              "-" +
              color.substring(0, 2).toUpperCase(),
            atributos: { talla: talla, color: color },
            precio: precioBase,
            costo: costoVariante || "",
            activo: true,
          });
          contador++;
        });
      });
    }
    setVariantes(nuevasVariantes);
    toast.success(
      "✨ " + nuevasVariantes.length + " variantes generadas automáticamente"
    );
  };

  const toggleTalla = (talla) => {
    setTallasSeleccionadas((prev) => {
      const existe = prev.includes(talla);
      return existe ? prev.filter((t) => t !== talla) : [...prev, talla];
    });
  };

  const toggleColor = (color) => {
    setColoresSeleccionados((prev) => {
      const existe = prev.includes(color);
      return existe ? prev.filter((c) => c !== color) : [...prev, color];
    });
  };

  const actualizarVariante = (index, campo, valor) => {
    const nuevasVariantes = [...variantes];
    nuevasVariantes[index][campo] = valor;
    setVariantes(nuevasVariantes);
  };

  const eliminarTodasVariantes = () => {
    if (window.confirm("¿Estás seguro de eliminar todas las variantes?")) {
      setVariantes([]);
      setTallasSeleccionadas([]);
      setColoresSeleccionados([]);
      toast.info("Variantes eliminadas");
    }
  };

  const eliminarVariante = (index) => {
    const nuevasVariantes = variantes.filter((_, i) => i !== index);
    setVariantes(nuevasVariantes);
    toast.info("Variante eliminada");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !precioBase.trim() || !categoriaId) {
      toast.error("Completa Nombre, Precio Base y Categoría");
      return;
    }
    if (variantes.length > 0) {
      const variantesInvalidas = variantes.some(
        (v) => !v.sku.trim() || !v.precio
      );
      if (variantesInvalidas) {
        toast.error("Todas las variantes deben tener SKU y precio");
        return;
      }
    }

    const productoPayload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria_id: categoriaId,
      precio_base: parseFloat(precioBase),
      marca: marca.trim(),
      activo: true,
    };

    setLoading(true);
    try {
      if (producto?.id) {
        // Modo edición: actualizar producto
        await ProductoService.actualizarProducto(producto.id, productoPayload);
        toast.success("✅ Producto actualizado exitosamente");
      } else {
        // Modo creación: crear producto con variantes
        const variantesFormateadas = variantes.map((v) => ({
          sku: v.sku.trim(),
          atributos: v.atributos,
          precio: parseFloat(v.precio),
          costo: v.costo ? parseFloat(v.costo) : null,
          activo: v.activo,
        }));

        await ProductoService.crearProducto({
          producto: productoPayload,
          variantes: variantesFormateadas,
        });
        toast.success("✅ Producto creado exitosamente");
      }

      if (refetch) await refetch();
      setShow(false);
    } catch (err) {
      console.error("Error guardando producto:", err);
      toast.error(err.message || "Error al guardar el producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registro-producto">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faBox} />
            </span>
            Nombre <span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ingresa el nombre del producto"
            required
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
            placeholder="Descripción detallada del producto"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faLayerGroup} />
            </span>
            Categoría <span className="required">*</span>
          </label>
          <select
            className="form-select"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            required
          >
            <option value="">— Selecciona una categoría —</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faDollarSign} />
            </span>
            Precio Base <span className="required">*</span>
          </label>
          <input
            type="number"
            className="form-control"
            value={precioBase}
            onChange={(e) => setPrecioBase(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label>
            <span className="icon">
              <FontAwesomeIcon icon={faCog} />
            </span>
            Marca
          </label>
          <input
            type="text"
            className="form-control"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Marca del producto (opcional)"
          />
        </div>

        <div className="variantes-section">
          <div className="variantes-header">
            <h4>
              <FontAwesomeIcon icon={faTags} /> Variantes del Producto
            </h4>
            {variantes.length > 0 && (
              <button
                type="button"
                className="btn-limpiar-variantes"
                onClick={eliminarTodasVariantes}
              >
                <FontAwesomeIcon icon={faTrash} /> Eliminar Todas
              </button>
            )}
          </div>

          {producto?.id && variantes.length > 0 && (
            <div className="info-edicion">
              <p>
                📝 <strong>Modo Edición:</strong> Las variantes actuales se
                muestran a continuación. Puedes modificar los precios/costos,
                eliminar variantes o agregar nuevas seleccionando tallas/colores
                adicionales.
              </p>
            </div>
          )}

          <div className="generador-variantes">
            <p className="info-text">
              Selecciona las tallas y colores para generar automáticamente todas
              las combinaciones de variantes.
            </p>

            <div className="atributos-selector">
              <label className="selector-label">
                <FontAwesomeIcon icon={faTags} /> Tallas Disponibles
              </label>
              <div className="atributos-grid">
                {TALLAS_DISPONIBLES.map((talla) => (
                  <button
                    key={talla}
                    type="button"
                    className={
                      "atributo-btn " +
                      (tallasSeleccionadas.includes(talla) ? "selected" : "")
                    }
                    onClick={() => toggleTalla(talla)}
                  >
                    {tallasSeleccionadas.includes(talla) && (
                      <FontAwesomeIcon icon={faCheck} className="check-icon" />
                    )}
                    {talla}
                  </button>
                ))}
              </div>
            </div>

            <div className="atributos-selector">
              <label className="selector-label">
                <FontAwesomeIcon icon={faTags} /> Colores Disponibles
              </label>
              <div className="atributos-grid">
                {COLORES_DISPONIBLES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={
                      "atributo-btn " +
                      (coloresSeleccionados.includes(color) ? "selected" : "")
                    }
                    onClick={() => toggleColor(color)}
                  >
                    {coloresSeleccionados.includes(color) && (
                      <FontAwesomeIcon icon={faCheck} className="check-icon" />
                    )}
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>
                <FontAwesomeIcon icon={faDollarSign} /> Costo (opcional)
              </label>
              <input
                type="number"
                className="form-control"
                value={costoVariante}
                onChange={(e) => setCostoVariante(e.target.value)}
                placeholder="Costo de adquisición"
                step="0.01"
                min="0"
              />
              <small className="form-text">
                Este costo se aplicará a todas las variantes generadas
              </small>
            </div>

            <button
              type="button"
              className="btn-generar-variantes"
              onClick={generarVariantes}
              disabled={
                !precioBase ||
                (tallasSeleccionadas.length === 0 &&
                  coloresSeleccionados.length === 0)
              }
            >
              <FontAwesomeIcon icon={faMagic} />{" "}
              {variantes.length > 0
                ? "Agregar Más Variantes"
                : "Generar Variantes Automáticamente"}
            </button>

            {tallasSeleccionadas.length > 0 &&
              coloresSeleccionados.length > 0 && (
                <p className="variantes-count">
                  Se generarán{" "}
                  <strong>
                    {tallasSeleccionadas.length * coloresSeleccionados.length}
                  </strong>{" "}
                  variantes
                </p>
              )}
            {tallasSeleccionadas.length > 0 &&
              coloresSeleccionados.length === 0 && (
                <p className="variantes-count">
                  Se generarán <strong>{tallasSeleccionadas.length}</strong>{" "}
                  variantes
                </p>
              )}
            {coloresSeleccionados.length > 0 &&
              tallasSeleccionadas.length === 0 && (
                <p className="variantes-count">
                  Se generarán <strong>{coloresSeleccionados.length}</strong>{" "}
                  variantes
                </p>
              )}
          </div>

          {variantes.length > 0 && (
            <div className="variantes-generadas">
              <p className="success-text">
                ✨ {variantes.length} variantes en total. Puedes editar
                precios/SKUs individualmente o eliminar variantes específicas.
              </p>
              <div className="variantes-list">
                {variantes.map((variante, index) => (
                  <div key={variante.id} className="variante-item-compacta">
                    <div className="variante-info">
                      <span className="variante-numero">#{index + 1}</span>
                      <span className="variante-sku">
                        <FontAwesomeIcon icon={faBarcode} /> {variante.sku}
                      </span>
                      <span className="variante-atributos">
                        {variante.atributos.talla && (
                          <span className="badge">
                            Talla: {variante.atributos.talla}
                          </span>
                        )}
                        {variante.atributos.color && (
                          <span className="badge">
                            Color: {variante.atributos.color}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="variante-precios">
                      <input
                        type="number"
                        className="input-precio"
                        value={variante.precio}
                        onChange={(e) =>
                          actualizarVariante(index, "precio", e.target.value)
                        }
                        placeholder="Precio"
                        step="0.01"
                        min="0"
                      />
                      <input
                        type="number"
                        className="input-costo"
                        value={variante.costo}
                        onChange={(e) =>
                          actualizarVariante(index, "costo", e.target.value)
                        }
                        placeholder="Costo"
                        step="0.01"
                        min="0"
                      />
                      <button
                        type="button"
                        className="btn-eliminar-variante"
                        onClick={() => eliminarVariante(index)}
                        title="Eliminar variante"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading && (
            <FontAwesomeIcon icon={faSpinner} spin className="spinner" />
          )}
          {producto?.id ? "Actualizar Producto" : "Guardar Producto"}
        </button>
      </form>
    </div>
  );
};

export default RegistroProducto;
