import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faPlus,
  faMinus,
  faBarcode,
  faTicket,
} from "@fortawesome/free-solid-svg-icons";
import { VentaService } from "../../services/supabase/ventaService";
import { DescuentoService } from "../../services/supabase/descuentoService";
import MisTickets from "./components/MisTickets";
import "./Preventa.scss";

const Preventa = () => {
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [procesandoTicket, setProcesandoTicket] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState(Date.now());

  // Estados para el cliente
  const [tipoCliente, setTipoCliente] = useState("general");
  const [datosCliente, setDatosCliente] = useState({
    nombre: "",
    telefono: "",
    email: "",
  });

  // Estados para tienda
  const [tiendas, setTiendas] = useState([]);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [usuarioTieneTienda, setUsuarioTieneTienda] = useState(false);

  // Estados para descuento
  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [descuentoAplicado, setDescuentoAplicado] = useState(null);
  const [validandoDescuento, setValidandoDescuento] = useState(false);

  // Estado para ver mis tickets
  const [mostrarMisTickets, setMostrarMisTickets] = useState(false);
  const [misTickets, setMisTickets] = useState([]);

  const searchInputRef = useRef(null);

  // Auto-focus en el input de búsqueda al cargar
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    cargarTiendasYUsuario();
  }, []);

  // Cargar tiendas disponibles y verificar si el usuario tiene tienda asignada
  const cargarTiendasYUsuario = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const tiendaUsuario = userData.tienda_id;

      const { TiendaService } = await import(
        "../../services/supabase/tiendaService"
      );
      const listaTiendas = await TiendaService.obtenerTiendas();

      setTiendas(listaTiendas);

      if (tiendaUsuario && listaTiendas.length > 0) {
        // Si tiendaUsuario es un número (ID antiguo de Firebase), buscar la tienda UUID correspondiente
        // Si ya es un UUID string, usarlo directamente
        const tiendaEncontrada = listaTiendas.find((t) => {
          // Verificar si el ID del usuario coincide con el ID de la tienda (puede ser entero o UUID)
          return t.id === tiendaUsuario || t.id === String(tiendaUsuario);
        });

        if (tiendaEncontrada) {
          setUsuarioTieneTienda(true);
          setTiendaSeleccionada(tiendaEncontrada.id); // Usar el UUID de la tienda encontrada
        } else {
          // Si no se encuentra, usar la primera tienda disponible
          console.warn(
            `⚠️ No se encontró tienda con ID ${tiendaUsuario}, usando primera tienda disponible`
          );
          setUsuarioTieneTienda(false);
          setTiendaSeleccionada(listaTiendas[0].id);
        }
      } else {
        setUsuarioTieneTienda(false);
        if (listaTiendas.length > 0) {
          setTiendaSeleccionada(listaTiendas[0].id);
        }
      }
    } catch (error) {
      console.error("Error al cargar tiendas:", error);
      toast.error("Error al cargar las tiendas");
    }
  };

  // Cargar mis tickets generados
  const cargarMisTickets = useCallback(async () => {
    try {
      if (!tiendaSeleccionada) return;
      const tickets = await VentaService.obtenerVentasPendientes(
        tiendaSeleccionada
      );
      // Filtrar solo los tickets del usuario actual
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const misTicketsFiltrados = tickets.filter(
        (t) => t.usuario_id === userData.id
      );
      setMisTickets(misTicketsFiltrados);
    } catch (error) {
      console.error("Error al cargar mis tickets:", error);
    }
  }, [tiendaSeleccionada]);

  // Cargar mis tickets cuando se abre el panel
  useEffect(() => {
    if (mostrarMisTickets) {
      cargarMisTickets();
    }
  }, [mostrarMisTickets, cargarMisTickets]);

  // Agregar producto al carrito
  const agregarAlCarrito = useCallback((variante) => {
    setCarrito((prevCarrito) => {
      const itemExistente = prevCarrito.find((item) => item.id === variante.id);

      if (itemExistente) {
        if (itemExistente.cantidad >= variante.stock_actual) {
          toast.warning("No hay suficiente stock disponible");
          return prevCarrito;
        }
        return prevCarrito.map((item) =>
          item.id === variante.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        return [
          ...prevCarrito,
          {
            id: variante.id,
            sku: variante.sku,
            nombre: variante.nombre_producto,
            atributos: variante.atributos,
            precio: variante.precio,
            cantidad: 1,
            stock_disponible: variante.stock_actual,
            imagen_url: variante.imagen_url,
            imagen_thumbnail_url: variante.imagen_thumbnail_url,
          },
        ];
      }
    });

    setBusqueda("");
    setResultadosBusqueda([]);

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Buscar y agregar automáticamente al carrito
  const buscarYAgregarAutomaticamente = useCallback(
    async (codigo) => {
      try {
        console.log("🔍 Buscando código:", codigo);
        const variantes = await VentaService.buscarVariantes(codigo);

        if (variantes.length === 1) {
          agregarAlCarrito(variantes[0]);
          toast.success(`Producto agregado: ${variantes[0].nombre_producto}`);
        } else if (variantes.length > 1) {
          agregarAlCarrito(variantes[0]);
          setBusqueda(codigo);
          setResultadosBusqueda(variantes);
          toast.success(
            `Producto agregado: ${variantes[0].nombre_producto}. Se encontraron ${variantes.length} productos`
          );
        } else {
          toast.warning("Producto no encontrado");
        }
      } catch (error) {
        console.error("Error al buscar:", error);
        toast.error("Error al buscar el producto");
      }
    },
    [agregarAlCarrito]
  );

  // Detector de escaneo de código de barras
  useEffect(() => {
    let buffer = "";
    let timeout;

    const handleKeyPress = (e) => {
      const currentTime = Date.now();

      if (currentTime - lastKeyTime > 100) {
        buffer = "";
      }

      setLastKeyTime(currentTime);

      if (document.activeElement?.tagName === "INPUT") {
        return;
      }

      if (e.key.length === 1 || e.key === "-") {
        buffer += e.key;

        clearTimeout(timeout);

        timeout = setTimeout(() => {
          if (buffer.length >= 3) {
            console.log("📷 Código escaneado:", buffer);
            buscarYAgregarAutomaticamente(buffer);
          }
          buffer = "";
        }, 50);
      }

      if (e.key === "Enter" && buffer.length >= 3) {
        clearTimeout(timeout);
        console.log("📷 Código escaneado (Enter):", buffer);
        buscarYAgregarAutomaticamente(buffer);
        buffer = "";
      }
    };

    window.addEventListener("keypress", handleKeyPress);

    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(timeout);
    };
  }, [lastKeyTime, buscarYAgregarAutomaticamente]);

  // Buscar variantes
  const handleBuscar = useCallback(
    async (termino) => {
      if (!termino.trim()) {
        setResultadosBusqueda([]);
        return;
      }

      try {
        const variantes = await VentaService.buscarVariantes(termino);

        if (variantes.length > 0) {
          agregarAlCarrito(variantes[0]);
          toast.success(`Producto agregado: ${variantes[0].nombre_producto}`);

          if (variantes.length > 1) {
            setResultadosBusqueda(variantes);
            toast.info(`Se encontraron ${variantes.length} productos en total`);
          } else {
            setResultadosBusqueda([]);
          }
        } else {
          setResultadosBusqueda([]);
        }
      } catch (error) {
        console.error("Error en buscarVariantes:", error);
        if (error.message.includes("No hay inventario disponible")) {
          toast.warning(
            "No hay inventario disponible de ese producto en esta tienda"
          );
          setResultadosBusqueda([]);
        } else if (error.requiere_tienda) {
          toast.warning("Por favor selecciona una tienda");
        } else {
          toast.error(error.message);
        }
        setResultadosBusqueda([]);
      }
    },
    [agregarAlCarrito]
  );

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busqueda) {
        handleBuscar(busqueda);
      } else {
        setResultadosBusqueda([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda, handleBuscar]);

  // Actualizar cantidad en el carrito
  const actualizarCantidad = (id, nuevaCantidad) => {
    const item = carrito.find((i) => i.id === id);

    if (nuevaCantidad < 1) {
      eliminarDelCarrito(id);
      return;
    }

    if (nuevaCantidad > item.stock_disponible) {
      toast.warning("No hay suficiente stock disponible");
      return;
    }

    setCarrito(
      carrito.map((item) =>
        item.id === id ? { ...item, cantidad: nuevaCantidad } : item
      )
    );
  };

  // Eliminar del carrito
  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
    toast.info("Producto eliminado del carrito");
    if (descuentoAplicado) {
      setDescuentoAplicado(null);
      setCodigoDescuento("");
      toast.info("Descuento eliminado. Aplícalo nuevamente si es necesario");
    }
  };

  // Aplicar código de descuento
  const aplicarDescuento = async () => {
    if (!codigoDescuento.trim()) {
      toast.warning("Ingresa un código de descuento");
      return;
    }

    if (carrito.length === 0) {
      toast.warning("Agrega productos antes de aplicar un descuento");
      return;
    }

    setValidandoDescuento(true);

    try {
      const subtotal = calcularSubtotal();
      const items = carrito.map((item) => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio: item.precio,
        producto: item.producto || {},
      }));

      const resultado = await DescuentoService.validarDescuento(
        codigoDescuento,
        subtotal,
        items,
        tipoCliente === "registrado" ? datosCliente : null
      );

      if (resultado.valido) {
        setDescuentoAplicado(resultado);
        toast.success(resultado.mensaje || "Descuento aplicado correctamente");
      } else {
        setDescuentoAplicado(null);
        toast.error(resultado.mensaje || "Código de descuento no válido");
      }
    } catch (error) {
      console.error("Error al validar descuento:", error);
      toast.error("Error al validar el código de descuento");
      setDescuentoAplicado(null);
    } finally {
      setValidandoDescuento(false);
    }
  };

  // Eliminar descuento aplicado
  const eliminarDescuento = () => {
    setDescuentoAplicado(null);
    setCodigoDescuento("");
    toast.info("Descuento eliminado");
  };

  // Calcular totales
  const calcularSubtotal = () => {
    return carrito.reduce(
      (total, item) => total + item.precio * item.cantidad,
      0
    );
  };

  const calcularDescuento = () => {
    if (!descuentoAplicado) return 0;
    return descuentoAplicado.montoDescuento || 0;
  };

  const calcularTotal = () => {
    return calcularSubtotal() - calcularDescuento();
  };

  // Generar ticket de preventa
  const generarTicket = async () => {
    if (carrito.length === 0) {
      toast.warning("El carrito está vacío");
      return;
    }

    if (tipoCliente === "registrado") {
      if (!datosCliente.nombre.trim()) {
        toast.error("Por favor ingresa el nombre del cliente");
        return;
      }
      if (!datosCliente.telefono.trim()) {
        toast.error("Por favor ingresa el teléfono del cliente");
        return;
      }
    }

    if (!tiendaSeleccionada) {
      toast.error("Por favor selecciona una tienda");
      return;
    }

    setProcesandoTicket(true);

    try {
      console.log(
        "🎫 Generando ticket con tienda_id:",
        tiendaSeleccionada,
        "- Tipo:",
        typeof tiendaSeleccionada
      );

      const ventaData = {
        items: carrito.map((item) => ({
          variante_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          subtotal: item.precio * item.cantidad,
        })),
        subtotal: calcularSubtotal(),
        descuento: calcularDescuento(),
        impuestos: 0,
        total: calcularTotal(),
        metodo_pago: {},
        estado_venta: "pendiente",
        tienda_id: tiendaSeleccionada,
        codigo_descuento_id: descuentoAplicado?.descuento?.id || null,
        descuento_aplicado: calcularDescuento(),
        cliente_info:
          tipoCliente === "registrado"
            ? {
                nombre: datosCliente.nombre,
                telefono: datosCliente.telefono,
                email: datosCliente.email || null,
              }
            : null,
        notas: "Ticket de preventa generado",
      };

      const resultado = await VentaService.crearVenta(ventaData);

      console.log(resultado);
      toast.success(
        `🎫 Ticket generado exitosamente. Llevar a caja para cobrar.`,
        { autoClose: 5000 }
      );

      // Limpiar carrito
      setCarrito([]);
      setCodigoDescuento("");
      setDescuentoAplicado(null);
      setTipoCliente("general");
      setDatosCliente({ nombre: "", telefono: "", email: "" });

      // Recargar mis tickets
      cargarMisTickets();

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (error) {
      console.error("Error al generar ticket:", error);
      toast.error(error.message);
    } finally {
      setProcesandoTicket(false);
    }
  };

  // Formatear atributos
  const formatAtributos = (atributos) => {
    if (!atributos || typeof atributos !== "object") return "";
    return Object.entries(atributos)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · ");
  };

  return (
    <div className="preventa-page">
      <header className="preventa-header">
        <div className="header-left">
          <h2>
            <FontAwesomeIcon icon={faTicket} /> Preventa - Generar Tickets
          </h2>
          <p className="subtitle">
            Genera tickets para que el cajero los cobre
          </p>
        </div>
        <div className="header-right">
          <button
            className="btn-mis-tickets"
            onClick={() => setMostrarMisTickets(!mostrarMisTickets)}
          >
            <FontAwesomeIcon icon={faTicket} />
            Mis Tickets ({misTickets.length})
          </button>
        </div>
      </header>

      <div className="preventa-container">
        {/* Panel izquierdo - Carrito */}
        <div className="panel-carrito">
          <div className="busqueda-productos">
            <FontAwesomeIcon icon={faBarcode} className="barcode-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Escanear código de barras o buscar SKU..."
              className="input-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Resultados de búsqueda */}
          {resultadosBusqueda.length > 0 && (
            <div className="resultados-rapidos">
              {resultadosBusqueda.map((variante) => (
                <div
                  key={variante.id}
                  className="resultado-item"
                  onClick={() => agregarAlCarrito(variante)}
                >
                  {(variante.imagen_thumbnail_url || variante.imagen_url) && (
                    <img
                      src={variante.imagen_thumbnail_url || variante.imagen_url}
                      alt={variante.nombre_producto}
                      className="resultado-imagen"
                    />
                  )}
                  <div className="resultado-info">
                    <span className="resultado-nombre">
                      {variante.nombre_producto}
                    </span>
                    <span className="resultado-sku">{variante.sku}</span>
                  </div>
                  <span className="resultado-precio">
                    $
                    {variante.precio.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Lista de items del carrito */}
          <div className="carrito-items">
            {carrito.length === 0 ? (
              <div className="carrito-vacio">
                <FontAwesomeIcon icon={faBarcode} size="3x" />
                <p>Escanea productos para comenzar</p>
                <span>El carrito está vacío</span>
              </div>
            ) : (
              carrito.map((item) => (
                <div key={item.id} className="carrito-item">
                  <div className="item-principal">
                    {(item.imagen_thumbnail_url || item.imagen_url) && (
                      <img
                        src={item.imagen_thumbnail_url || item.imagen_url}
                        alt={item.nombre}
                        className="item-imagen"
                      />
                    )}
                    <div className="item-info">
                      <h4>{item.nombre}</h4>
                      {item.atributos && (
                        <p className="item-variante">
                          {formatAtributos(item.atributos)}
                        </p>
                      )}
                      <p className="item-sku">SKU: {item.sku}</p>
                    </div>
                    <div className="item-precio-unitario">
                      $
                      {item.precio.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="item-controles">
                    <div className="item-cantidad-control">
                      <button
                        className="btn-cantidad"
                        onClick={() =>
                          actualizarCantidad(item.id, item.cantidad - 1)
                        }
                      >
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <span className="cantidad-valor">{item.cantidad}</span>
                      <button
                        className="btn-cantidad"
                        onClick={() =>
                          actualizarCantidad(item.id, item.cantidad + 1)
                        }
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                    <div className="item-subtotal">
                      $
                      {(item.precio * item.cantidad).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho - Cliente y Generación */}
        <div className="panel-generacion">
          {/* Información del cliente */}
          <div className="seccion-cliente">
            <h4>Cliente</h4>
            <div className="cliente-selector">
              <select
                className="select-cliente"
                value={tipoCliente}
                onChange={(e) => setTipoCliente(e.target.value)}
              >
                <option value="general">Cliente General</option>
                <option value="registrado">Cliente Registrado</option>
              </select>
            </div>

            {tipoCliente === "registrado" && (
              <div className="cliente-inputs">
                <div className="input-group">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={datosCliente.nombre}
                    onChange={(e) =>
                      setDatosCliente({
                        ...datosCliente,
                        nombre: e.target.value,
                      })
                    }
                    className="input-cliente"
                  />
                </div>
                <div className="input-group">
                  <label>Teléfono:</label>
                  <input
                    type="tel"
                    placeholder="(000) 000-0000"
                    value={datosCliente.telefono}
                    onChange={(e) =>
                      setDatosCliente({
                        ...datosCliente,
                        telefono: e.target.value,
                      })
                    }
                    className="input-cliente"
                  />
                </div>
                <div className="input-group">
                  <label>Email (opcional):</label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={datosCliente.email}
                    onChange={(e) =>
                      setDatosCliente({
                        ...datosCliente,
                        email: e.target.value,
                      })
                    }
                    className="input-cliente"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Resumen y acción */}
          {carrito.length > 0 && (
            <>
              {/* Código de descuento */}
              <div className="seccion-descuento">
                <h4>Código de Descuento</h4>
                {!descuentoAplicado ? (
                  <div className="descuento-input-group">
                    <input
                      type="text"
                      placeholder="Código de descuento"
                      value={codigoDescuento}
                      onChange={(e) =>
                        setCodigoDescuento(e.target.value.toUpperCase())
                      }
                      className="input-descuento"
                      disabled={validandoDescuento}
                    />
                    <button
                      className="btn-aplicar-descuento"
                      onClick={aplicarDescuento}
                      disabled={validandoDescuento || !codigoDescuento.trim()}
                    >
                      {validandoDescuento ? "Validando..." : "Aplicar"}
                    </button>
                  </div>
                ) : (
                  <div className="descuento-aplicado">
                    <div className="descuento-info">
                      <span className="descuento-icono">🎟️</span>
                      <div className="descuento-detalle">
                        <span className="descuento-codigo">
                          {descuentoAplicado.descuento.codigo}
                        </span>
                        <span className="descuento-nombre">
                          {descuentoAplicado.descuento.nombre}
                        </span>
                      </div>
                      <span className="descuento-monto">
                        -$
                        {descuentoAplicado.montoDescuento.toLocaleString(
                          "es-MX",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                    <button
                      className="btn-eliminar-descuento"
                      onClick={eliminarDescuento}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="seccion-resumen">
                <h4>Resumen</h4>
                <div className="resumen-detalle">
                  <div className="resumen-row">
                    <span>Subtotal</span>
                    <span className="resumen-valor">
                      $
                      {calcularSubtotal().toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {descuentoAplicado && (
                    <div className="resumen-row descuento">
                      <span>Descuento</span>
                      <span className="resumen-valor descuento-valor">
                        -$
                        {calcularDescuento().toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="resumen-row total">
                    <span>Total</span>
                    <span className="resumen-valor">
                      $
                      {calcularTotal().toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector de tienda */}
              {!usuarioTieneTienda && tiendas.length > 0 && (
                <div className="selector-tienda">
                  <label>Tienda:</label>
                  <select
                    value={tiendaSeleccionada}
                    onChange={(e) => setTiendaSeleccionada(e.target.value)}
                    className="select-tienda"
                  >
                    {tiendas.map((tienda) => (
                      <option key={tienda.id} value={tienda.id}>
                        {tienda.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                className="btn-generar-ticket"
                onClick={generarTicket}
                disabled={procesandoTicket}
              >
                {procesandoTicket ? (
                  <>
                    <div className="spinner-small"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTicket} />
                    Generar Ticket de Preventa - $
                    {calcularTotal().toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </>
                )}
              </button>
            </>
          )}

          {carrito.length === 0 && (
            <div className="panel-vacio">
              <FontAwesomeIcon icon={faShoppingCart} size="3x" />
              <p>Agrega productos al carrito</p>
              <span>Escanea códigos de barras o busca productos por SKU</span>
            </div>
          )}
        </div>
      </div>

      {/* Panel lateral de Mis Tickets */}
      {mostrarMisTickets && (
        <MisTickets
          tickets={misTickets}
          onClose={() => setMostrarMisTickets(false)}
          onRefresh={cargarMisTickets}
        />
      )}
    </div>
  );
};

export default Preventa;
