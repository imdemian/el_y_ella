// src/pages/Apartados/CrearApartado.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faPlus,
  faTrash,
  faSave,
  faUser,
  faPhone,
  faEnvelope,
  faCalendarAlt,
  faSearch,
  faTag,
  faRuler,
  faScissors,
  faTshirt,
} from "@fortawesome/free-solid-svg-icons";
import { ApartadoService } from "../../services/supabase/apartadoService";
import { VentaService } from "../../services/supabase/ventaService";
import "./CrearApartado.scss";

const CrearApartado = ({ tiendaId, apartadoId = null, onClose, onCreado }) => {
  const modoEdicion = !!apartadoId;

  // Estado del formulario
  const [clienteInfo, setClienteInfo] = useState({
    nombre: "",
    telefono: "",
    email: "",
    notas: "",
  });

  const [fechaEntrega, setFechaEntrega] = useState("");
  const [items, setItems] = useState([]);
  const [anticipo, setAnticipo] = useState("");
  const [metodoPagoAnticipo, setMetodoPagoAnticipo] = useState("efectivo");
  const [guardando, setGuardando] = useState(false);

  // Estados para agregar items
  const [tipoItem, setTipoItem] = useState("producto"); // producto, arreglo, servicio
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [catalogoArreglos, setCatalogoArreglos] = useState([]);
  const [arregloSeleccionado, setArregloSeleccionado] = useState("");
  const [servicioDescripcion, setServicioDescripcion] = useState("");
  const [servicioMonto, setServicioMonto] = useState("");

  // Estado para medidas del item actual
  const [medidasActuales, setMedidasActuales] = useState({
    busto: "",
    cintura: "",
    cadera: "",
    espalda: "",
    largo: "",
    manga: "",
    otros: "",
  });

  // Cargar catálogo de arreglos y datos del apartado si es edición
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar catálogo de arreglos
        const catalogo = await ApartadoService.obtenerCatalogoArreglos();
        setCatalogoArreglos(catalogo);

        // Si es modo edición, cargar datos del apartado
        if (modoEdicion && apartadoId) {
          const apartado = await ApartadoService.obtenerApartadoPorId(
            apartadoId
          );

          setClienteInfo({
            nombre: apartado.cliente_info?.nombre || "",
            telefono: apartado.cliente_info?.telefono || "",
            email: apartado.cliente_info?.email || "",
            notas: apartado.cliente_info?.notas || "",
          });

          if (apartado.fecha_entrega_estimada) {
            setFechaEntrega(apartado.fecha_entrega_estimada);
          }

          setItems(apartado.items || []);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast.error("Error al cargar los datos");
      }
    };
    cargarDatos();
  }, [modoEdicion, apartadoId]);

  // Buscar productos
  const buscarProducto = async () => {
    if (!busquedaProducto.trim()) return;

    try {
      const resultados = await VentaService.buscarVariantes(busquedaProducto);
      setResultadosBusqueda(resultados);
    } catch (error) {
      console.error("Error al buscar productos:", error);
      toast.error("Error al buscar productos");
    }
  };

  // Agregar producto al apartado
  const agregarProducto = (variante) => {
    const nuevoItem = {
      tempId: Date.now(),
      tipo_item: "producto",
      producto_variante_id: variante.id,
      producto_nombre: `${variante.nombre_producto} - ${Object.values(
        variante.atributos || {}
      ).join(" / ")}`,
      sku: variante.sku,
      cantidad: 1,
      precio_unitario: variante.precio,
      medidas: { ...medidasActuales },
      descripcion_arreglo: "",
    };

    setItems([...items, nuevoItem]);
    setBusquedaProducto("");
    setResultadosBusqueda([]);
    limpiarMedidas();
    toast.success("Producto agregado");
  };

  // Agregar arreglo
  const agregarArreglo = () => {
    const arreglo = catalogoArreglos.find(
      (a) => a.id === parseInt(arregloSeleccionado)
    );
    if (!arreglo) {
      toast.error("Selecciona un tipo de arreglo");
      return;
    }

    const nuevoItem = {
      tempId: Date.now(),
      tipo_item: "arreglo",
      producto_variante_id: null,
      producto_nombre: arreglo.nombre,
      sku: null,
      cantidad: 1,
      precio_unitario: arreglo.precio_sugerido,
      medidas: { ...medidasActuales },
      descripcion_arreglo: "",
    };

    setItems([...items, nuevoItem]);
    setArregloSeleccionado("");
    limpiarMedidas();
    toast.success("Arreglo agregado");
  };

  // Agregar servicio personalizado
  const agregarServicio = () => {
    if (!servicioDescripcion.trim()) {
      toast.error("Ingresa una descripción del servicio");
      return;
    }
    if (!servicioMonto || parseFloat(servicioMonto) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    const nuevoItem = {
      tempId: Date.now(),
      tipo_item: "servicio",
      producto_variante_id: null,
      producto_nombre: servicioDescripcion,
      sku: null,
      cantidad: 1,
      precio_unitario: parseFloat(servicioMonto),
      medidas: { ...medidasActuales },
      descripcion_arreglo: "",
    };

    setItems([...items, nuevoItem]);
    setServicioDescripcion("");
    setServicioMonto("");
    limpiarMedidas();
    toast.success("Servicio agregado");
  };

  // Limpiar medidas
  const limpiarMedidas = () => {
    setMedidasActuales({
      busto: "",
      cintura: "",
      cadera: "",
      espalda: "",
      largo: "",
      manga: "",
      otros: "",
    });
  };

  // Eliminar item
  const eliminarItem = (tempIdOrId) => {
    setItems(items.filter((item) => (item.tempId || item.id) !== tempIdOrId));
  };

  // Calcular total
  const calcularTotal = () => {
    return items.reduce(
      (sum, item) => sum + item.precio_unitario * item.cantidad,
      0
    );
  };

  // Guardar apartado (crear o actualizar)
  const guardarApartado = async () => {
    // Validaciones
    if (!clienteInfo.nombre.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }
    if (!clienteInfo.telefono.trim()) {
      toast.error("El teléfono del cliente es obligatorio");
      return;
    }
    if (items.length === 0) {
      toast.error("Agrega al menos un producto o servicio");
      return;
    }

    setGuardando(true);

    try {
      if (modoEdicion) {
        // Actualizar apartado existente
        const apartadoData = {
          cliente_info: {
            nombre: clienteInfo.nombre,
            telefono: clienteInfo.telefono,
            email: clienteInfo.email || null,
            notas: clienteInfo.notas || null,
          },
          fecha_entrega_estimada: fechaEntrega || null,
          items: items.map((item) => ({
            id: item.id || null,
            tipo_item: item.tipo_item,
            producto_variante_id: item.producto_variante_id,
            producto_nombre: item.producto_nombre,
            sku: item.sku,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            medidas: item.medidas,
            descripcion_arreglo: item.descripcion_arreglo,
          })),
        };

        await ApartadoService.actualizarApartado(apartadoId, apartadoData);
        toast.success("Apartado actualizado exitosamente");
        onCreado();
      } else {
        // Crear nuevo apartado
        const userData = JSON.parse(localStorage.getItem("app_user") || "{}");

        const apartadoData = {
          tienda_id: tiendaId,
          usuario_id: userData.id,
          cliente_info: {
            nombre: clienteInfo.nombre,
            telefono: clienteInfo.telefono,
            email: clienteInfo.email || null,
            notas: clienteInfo.notas || null,
          },
          fecha_entrega_estimada: fechaEntrega || null,
          total: calcularTotal(),
          items: items.map((item) => ({
            tipo_item: item.tipo_item,
            producto_variante_id: item.producto_variante_id,
            producto_nombre: item.producto_nombre,
            sku: item.sku,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            medidas: item.medidas,
            descripcion_arreglo: item.descripcion_arreglo,
          })),
        };

        // Si hay anticipo, agregarlo
        if (anticipo && parseFloat(anticipo) > 0) {
          apartadoData.anticipo = parseFloat(anticipo);
          apartadoData.metodo_pago_anticipo = {
            [metodoPagoAnticipo]: parseFloat(anticipo),
          };
        }

        const resultado = await ApartadoService.crearApartado(apartadoData);
        toast.success(`Apartado ${resultado.folio} creado exitosamente`);
        onCreado();
      }
    } catch (error) {
      console.error(
        `Error al ${modoEdicion ? "actualizar" : "crear"} apartado:`,
        error
      );
      toast.error(
        error.message ||
          `Error al ${modoEdicion ? "actualizar" : "crear"} el apartado`
      );
    } finally {
      setGuardando(false);
    }
  };

  // Formatear moneda
  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cantidad || 0);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content crear-apartado-modal">
        {/* Header */}
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faTag} />{" "}
            {modoEdicion ? "Editar Apartado" : "Nuevo Apartado"}
          </h2>
          <button className="btn-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Sección Cliente */}
          <section className="form-section">
            <h3>
              <FontAwesomeIcon icon={faUser} /> Información del Cliente
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  Nombre <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={clienteInfo.nombre}
                  onChange={(e) =>
                    setClienteInfo({ ...clienteInfo, nombre: e.target.value })
                  }
                  placeholder="Nombre completo"
                />
              </div>
              <div className="form-group">
                <label>
                  Teléfono <span className="required">*</span>
                </label>
                <div className="input-icon">
                  <FontAwesomeIcon icon={faPhone} />
                  <input
                    type="tel"
                    value={clienteInfo.telefono}
                    onChange={(e) =>
                      setClienteInfo({
                        ...clienteInfo,
                        telefono: e.target.value,
                      })
                    }
                    placeholder="10 dígitos"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <div className="input-icon">
                  <FontAwesomeIcon icon={faEnvelope} />
                  <input
                    type="email"
                    value={clienteInfo.email}
                    onChange={(e) =>
                      setClienteInfo({ ...clienteInfo, email: e.target.value })
                    }
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Fecha Estimada de Entrega</label>
                <div className="input-icon">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="form-group full-width">
              <label>Notas adicionales</label>
              <textarea
                value={clienteInfo.notas}
                onChange={(e) =>
                  setClienteInfo({ ...clienteInfo, notas: e.target.value })
                }
                placeholder="Notas sobre el cliente o el pedido..."
                rows={2}
              />
            </div>
          </section>

          {/* Sección Agregar Items */}
          <section className="form-section">
            <h3>
              <FontAwesomeIcon icon={faPlus} /> Agregar Items
            </h3>

            {/* Tabs de tipo de item */}
            <div className="tipo-item-tabs">
              <button
                className={`tab ${tipoItem === "producto" ? "active" : ""}`}
                onClick={() => setTipoItem("producto")}
              >
                <FontAwesomeIcon icon={faTshirt} /> Producto
              </button>
              <button
                className={`tab ${tipoItem === "arreglo" ? "active" : ""}`}
                onClick={() => setTipoItem("arreglo")}
              >
                <FontAwesomeIcon icon={faScissors} /> Arreglo
              </button>
              <button
                className={`tab ${tipoItem === "servicio" ? "active" : ""}`}
                onClick={() => setTipoItem("servicio")}
              >
                <FontAwesomeIcon icon={faTag} /> Servicio
              </button>
            </div>

            {/* Formulario según tipo de item */}
            <div className="agregar-item-form">
              {tipoItem === "producto" && (
                <div className="busqueda-producto">
                  <div className="form-group">
                    <label>Buscar Producto (SKU o nombre)</label>
                    <div className="input-with-button">
                      <input
                        type="text"
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && buscarProducto()}
                        placeholder="Escanea o escribe el código..."
                      />
                      <button
                        className="btn btn-primary"
                        onClick={buscarProducto}
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </button>
                    </div>
                  </div>
                  {resultadosBusqueda.length > 0 && (
                    <div className="resultados-busqueda">
                      {resultadosBusqueda.map((variante) => (
                        <div
                          key={variante.id}
                          className="resultado-item"
                          onClick={() => agregarProducto(variante)}
                        >
                          <span className="sku">{variante.sku}</span>
                          <span className="nombre">
                            {variante.nombre_producto} -{" "}
                            {Object.values(variante.atributos || {}).join(
                              " / "
                            )}
                          </span>
                          <span className="precio">
                            {formatearMoneda(variante.precio)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tipoItem === "arreglo" && (
                <div className="form-group">
                  <label>Tipo de Arreglo</label>
                  <div className="input-with-button">
                    <select
                      value={arregloSeleccionado}
                      onChange={(e) => setArregloSeleccionado(e.target.value)}
                    >
                      <option value="">Selecciona un arreglo...</option>
                      {catalogoArreglos.map((arreglo) => (
                        <option key={arreglo.id} value={arreglo.id}>
                          {arreglo.nombre} -{" "}
                          {formatearMoneda(arreglo.precio_sugerido)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      onClick={agregarArreglo}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                </div>
              )}

              {tipoItem === "servicio" && (
                <div className="servicio-form">
                  <div className="form-group">
                    <label>Descripción del Servicio</label>
                    <input
                      type="text"
                      value={servicioDescripcion}
                      onChange={(e) => setServicioDescripcion(e.target.value)}
                      placeholder="Ej: Bordado personalizado, ajuste especial..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Monto</label>
                    <div className="input-with-button">
                      <input
                        type="number"
                        value={servicioMonto}
                        onChange={(e) => setServicioMonto(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      <button
                        className="btn btn-primary"
                        onClick={agregarServicio}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección de medidas */}
              <div className="medidas-section">
                <h4>
                  <FontAwesomeIcon icon={faRuler} /> Medidas (opcional)
                </h4>
                <div className="medidas-grid">
                  <div className="form-group">
                    <label>Busto</label>
                    <input
                      type="text"
                      value={medidasActuales.busto}
                      onChange={(e) =>
                        setMedidasActuales({
                          ...medidasActuales,
                          busto: e.target.value,
                        })
                      }
                      placeholder="cm"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cintura</label>
                    <input
                      type="text"
                      value={medidasActuales.cintura}
                      onChange={(e) =>
                        setMedidasActuales({
                          ...medidasActuales,
                          cintura: e.target.value,
                        })
                      }
                      placeholder="cm"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cadera</label>
                    <input
                      type="text"
                      value={medidasActuales.cadera}
                      onChange={(e) =>
                        setMedidasActuales({
                          ...medidasActuales,
                          cadera: e.target.value,
                        })
                      }
                      placeholder="cm"
                    />
                  </div>
                  <div className="form-group">
                    <label>Espalda</label>
                    <input
                      type="text"
                      value={medidasActuales.espalda}
                      onChange={(e) =>
                        setMedidasActuales({
                          ...medidasActuales,
                          espalda: e.target.value,
                        })
                      }
                      placeholder="cm"
                    />
                  </div>
                  <div className="form-group">
                    <label>Largo</label>
                    <input
                      type="text"
                      value={medidasActuales.largo}
                      onChange={(e) =>
                        setMedidasActuales({
                          ...medidasActuales,
                          largo: e.target.value,
                        })
                      }
                      placeholder="cm"
                    />
                  </div>
                  <div className="form-group">
                    <label>Manga</label>
                    <input
                      type="text"
                      value={medidasActuales.manga}
                      onChange={(e) =>
                        setMedidasActuales({
                          ...medidasActuales,
                          manga: e.target.value,
                        })
                      }
                      placeholder="cm"
                    />
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Otras medidas</label>
                  <input
                    type="text"
                    value={medidasActuales.otros}
                    onChange={(e) =>
                      setMedidasActuales({
                        ...medidasActuales,
                        otros: e.target.value,
                      })
                    }
                    placeholder="Medidas adicionales..."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Lista de items agregados */}
          {items.length > 0 && (
            <section className="form-section">
              <h3>
                <FontAwesomeIcon icon={faTshirt} /> Items del Apartado
              </h3>
              <div className="items-list">
                {items.map((item) => (
                  <div key={item.tempId} className="item-card">
                    <div className="item-info">
                      <span className={`tipo-badge ${item.tipo_item}`}>
                        {item.tipo_item}
                      </span>
                      <span className="nombre">{item.producto_nombre}</span>
                      {item.sku && <span className="sku">SKU: {item.sku}</span>}
                    </div>
                    <div className="item-precio">
                      {formatearMoneda(item.precio_unitario)}
                    </div>
                    <button
                      className="btn btn-icon btn-danger"
                      onClick={() => eliminarItem(item.tempId)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="total-section">
                <span>Total:</span>
                <strong>{formatearMoneda(calcularTotal())}</strong>
              </div>
            </section>
          )}

          {/* Sección Anticipo */}
          {items.length > 0 && !modoEdicion && (
            <section className="form-section anticipo-section">
              <h3>
                <FontAwesomeIcon icon={faTag} /> Anticipo (opcional)
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Monto del anticipo</label>
                  <input
                    type="number"
                    value={anticipo}
                    onChange={(e) => setAnticipo(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    max={calcularTotal()}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Método de pago</label>
                  <select
                    value={metodoPagoAnticipo}
                    onChange={(e) => setMetodoPagoAnticipo(e.target.value)}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={guardarApartado}
            disabled={guardando || items.length === 0}
          >
            {guardando ? (
              <>Guardando...</>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />{" "}
                {modoEdicion ? "Guardar Cambios" : "Crear Apartado"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearApartado;
