import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBarcode,
  faCashRegister,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import { VentaService } from "../../services/supabase/ventaService";
import TicketsPendientes from "./components/TicketsPendientes";
import "./Caja.scss";

const Caja = () => {
  const [folioTicket, setFolioTicket] = useState("");
  const [ticketCargado, setTicketCargado] = useState(null);
  const [buscandoTicket, setBuscandoTicket] = useState(false);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [montoPagado, setMontoPagado] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Estado para tickets pendientes
  const [ticketsPendientes, setTicketsPendientes] = useState([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);

  // Estado para tienda
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [tiendas, setTiendas] = useState([]);
  const [esAdmin, setEsAdmin] = useState(true);

  const folioInputRef = useRef(null);
  const montoInputRef = useRef(null);

  // Cargar tickets pendientes
  const cargarTicketsPendientes = useCallback(async () => {
    if (!tiendaSeleccionada) {
      console.log("⚠️ No hay tienda seleccionada, no se cargan tickets");
      return;
    }

    console.log(
      "🔄 Cargando tickets pendientes para tienda:",
      tiendaSeleccionada
    );
    setCargandoPendientes(true);
    try {
      const tickets = await VentaService.obtenerVentasPendientes(
        tiendaSeleccionada
      );
      console.log("✅ Tickets pendientes cargados:", tickets.length, "tickets");
      console.log("📋 Tickets:", tickets);
      setTicketsPendientes(tickets);
    } catch (error) {
      console.error("❌ Error al cargar tickets pendientes:", error);
      toast.error("Error al cargar tickets pendientes");
    } finally {
      setCargandoPendientes(false);
    }
  }, [tiendaSeleccionada]);

  useEffect(() => {
    // Cargar tienda del usuario y lista de tiendas
    const cargarTiendaUsuario = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("app_user") || "{}");
        const tiendaUsuario = userData.tienda_id;
        const rolUsuario = userData.rol;

        // Verificar si es administrador
        setEsAdmin(rolUsuario === "admin");

        // Importar TiendaService para obtener la lista de tiendas
        const { TiendaService } = await import(
          "../../services/supabase/tiendaService"
        );
        const listaTiendas = await TiendaService.obtenerTiendas();
        setTiendas(listaTiendas);

        if (tiendaUsuario) {
          // Si el usuario tiene tienda asignada, buscarla en la lista
          const tiendaEncontrada = listaTiendas.find((t) => {
            return t.id === tiendaUsuario || t.id === String(tiendaUsuario);
          });

          if (tiendaEncontrada) {
            setTiendaSeleccionada(tiendaEncontrada.id);
          } else if (listaTiendas.length > 0) {
            setTiendaSeleccionada(listaTiendas[0].id);
            console.warn(
              `No se encontró tienda con ID ${tiendaUsuario}, usando primera tienda disponible`
            );
          }
        } else if (rolUsuario === "admin" && listaTiendas.length > 0) {
          // Si es admin sin tienda asignada, seleccionar la primera
          setTiendaSeleccionada(listaTiendas[0].id);
        }
      } catch (error) {
        console.error("Error al cargar tienda del usuario:", error);
        toast.error("Error al cargar la tienda");
      }
    };

    cargarTiendaUsuario();

    // Auto-focus en input de folio
    if (folioInputRef.current) {
      folioInputRef.current.focus();
    }
  }, []);

  // Cargar tickets pendientes cuando hay tienda
  useEffect(() => {
    if (tiendaSeleccionada) {
      cargarTicketsPendientes();
    }
  }, [tiendaSeleccionada, cargarTicketsPendientes]);

  // Buscar ticket por folio
  const buscarTicket = async (folio = folioTicket) => {
    if (!folio.trim()) {
      toast.warning("Ingresa un número de folio");
      return;
    }

    setBuscandoTicket(true);

    try {
      const venta = await VentaService.buscarPorFolio(folio);

      if (venta.estado_venta !== "pendiente") {
        toast.error(
          `Este ticket ya fue ${
            venta.estado_venta === "completada" ? "cobrado" : "cancelado"
          }`
        );
        setFolioTicket("");
        return;
      }

      setTicketCargado(venta);
      setFolioTicket("");
      toast.success(`✅ Ticket #${venta.folio} cargado correctamente`);

      // Auto-focus en monto si es efectivo
      if (metodoPago === "efectivo" && montoInputRef.current) {
        setTimeout(() => montoInputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error("Error al buscar ticket:", error);
      toast.error(error.message);
      setFolioTicket("");
    } finally {
      setBuscandoTicket(false);
    }
  };

  // Limpiar ticket cargado
  const limpiarTicket = () => {
    setTicketCargado(null);
    setMontoPagado("");
    setMetodoPago("efectivo");
    if (folioInputRef.current) {
      folioInputRef.current.focus();
    }
  };

  // Cobrar ticket
  const cobrarTicket = async () => {
    if (!ticketCargado) {
      toast.error("No hay ticket cargado");
      return;
    }

    const total = ticketCargado.total;
    const pago = parseFloat(montoPagado) || 0;

    if (metodoPago === "efectivo" && pago < total) {
      toast.error("El monto pagado es insuficiente");
      return;
    }

    setProcesandoPago(true);

    try {
      const metodoPagoData = {
        [metodoPago]: metodoPago === "efectivo" ? pago : total,
      };

      const resultado = await VentaService.cobrarVentaPendiente(
        ticketCargado.id,
        metodoPagoData
      );

      toast.success(`✅ Ticket #${resultado.folio} cobrado exitosamente`);

      // Mostrar cambio si es efectivo
      if (metodoPago === "efectivo" && pago > total) {
        const cambio = pago - total;
        toast.info(
          `💰 Cambio: $${cambio.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
          })}`,
          { autoClose: 8000 }
        );
      }

      // Limpiar y recargar pendientes
      limpiarTicket();
      cargarTicketsPendientes();
    } catch (error) {
      console.error("Error al cobrar ticket:", error);
      toast.error(error.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  // Calcular cambio
  const calcularCambio = () => {
    if (metodoPago !== "efectivo" || !ticketCargado) return 0;
    const pago = parseFloat(montoPagado) || 0;
    const cambio = pago - ticketCargado.total;
    return cambio > 0 ? cambio : 0;
  };

  // Formatear atributos
  const formatAtributos = (atributos) => {
    if (!atributos || typeof atributos !== "object") return "";
    return Object.entries(atributos)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · ");
  };

  // Formatear fecha
  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="caja-page">
      <header className="caja-header">
        <div className="header-left">
          <h2>
            <FontAwesomeIcon icon={faCashRegister} /> Caja - Cobrar Tickets
          </h2>
          <p className="subtitle">
            Escanea o busca el folio del ticket para cobrar
          </p>
        </div>
        <div className="header-right">
          {esAdmin && (
            <select
              className="select-tienda"
              value={tiendaSeleccionada}
              onChange={(e) => setTiendaSeleccionada(e.target.value)}
            >
              {tiendas.map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn-refresh"
            onClick={cargarTicketsPendientes}
            disabled={cargandoPendientes}
          >
            <FontAwesomeIcon icon={faSync} spin={cargandoPendientes} />
            Actualizar
          </button>
        </div>
      </header>

      <div className="caja-container">
        {/* Panel izquierdo - Escáner y Detalles */}
        <div className="panel-ticket">
          {!ticketCargado ? (
            <>
              {/* Escáner de folio */}
              <div className="escaner-folio">
                <FontAwesomeIcon icon={faBarcode} size="3x" />
                <h3>Escanear Ticket</h3>
                <div className="input-folio-container">
                  <input
                    ref={folioInputRef}
                    type="text"
                    className="input-folio-grande"
                    placeholder="Escanear o ingresar folio..."
                    value={folioTicket}
                    onChange={(e) => setFolioTicket(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        buscarTicket();
                      }
                    }}
                  />
                  <button
                    className="btn-buscar"
                    onClick={() => buscarTicket()}
                    disabled={buscandoTicket}
                  >
                    {buscandoTicket ? "Buscando..." : "Buscar"}
                  </button>
                </div>
              </div>

              {/* Lista de tickets pendientes */}
              <TicketsPendientes
                tickets={ticketsPendientes}
                onSelectTicket={(folio) => buscarTicket(folio)}
                cargando={cargandoPendientes}
              />
            </>
          ) : (
            /* Detalles del ticket cargado */
            <div className="detalle-ticket">
              <div className="ticket-info-header">
                <h3>Ticket #{ticketCargado.folio}</h3>
                <button className="btn-limpiar" onClick={limpiarTicket}>
                  ✕ Limpiar
                </button>
              </div>

              <div className="ticket-metadata">
                <div className="meta-item">
                  <span className="label">Vendedor:</span>
                  <span className="value">
                    {ticketCargado.vendedor || "N/A"}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="label">Cliente:</span>
                  <span className="value">
                    {ticketCargado.cliente_info?.nombre || "General"}
                  </span>
                </div>
                {ticketCargado.cliente_info?.telefono && (
                  <div className="meta-item">
                    <span className="label">Teléfono:</span>
                    <span className="value">
                      {ticketCargado.cliente_info.telefono}
                    </span>
                  </div>
                )}
                <div className="meta-item">
                  <span className="label">Fecha:</span>
                  <span className="value">
                    {formatFecha(ticketCargado.created_at)}
                  </span>
                </div>
              </div>

              <div className="ticket-items">
                <h4>Productos</h4>
                <div className="items-list">
                  {ticketCargado.ventas_items.map((item) => (
                    <div key={item.id} className="item-detalle">
                      {(item.variantes_producto?.imagen_thumbnail_url ||
                        item.variantes_producto?.imagen_url) && (
                        <img
                          src={
                            item.variantes_producto.imagen_thumbnail_url ||
                            item.variantes_producto.imagen_url
                          }
                          alt={item.variantes_producto.productos?.nombre}
                          className="item-imagen"
                        />
                      )}
                      <div className="item-info">
                        <h5>
                          {item.variantes_producto.productos?.nombre ||
                            "Producto"}
                        </h5>
                        {item.variantes_producto.atributos && (
                          <p className="item-variante">
                            {formatAtributos(item.variantes_producto.atributos)}
                          </p>
                        )}
                        <p className="item-sku">
                          SKU: {item.variantes_producto.sku}
                        </p>
                      </div>
                      <div className="item-cantidad">x{item.cantidad}</div>
                      <div className="item-precio">
                        $
                        {item.subtotal_linea.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {ticketCargado.descuento_aplicado > 0 && (
                <div className="ticket-descuento">
                  <span>Descuento aplicado:</span>
                  <span className="descuento-valor">
                    -$
                    {ticketCargado.descuento_aplicado.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="ticket-total-final">
                <span>TOTAL A COBRAR:</span>
                <span className="total-valor">
                  $
                  {ticketCargado.total.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho - Pago */}
        <div className="panel-pago">
          {ticketCargado ? (
            <>
              <div className="seccion-metodo-pago">
                <h4>Método de Pago</h4>
                <div className="metodos">
                  <button
                    className={`metodo-btn ${
                      metodoPago === "efectivo" ? "active" : ""
                    }`}
                    onClick={() => setMetodoPago("efectivo")}
                  >
                    <span className="metodo-icono">💵</span>
                    <span>Efectivo</span>
                  </button>
                  <button
                    className={`metodo-btn ${
                      metodoPago === "tarjeta" ? "active" : ""
                    }`}
                    onClick={() => setMetodoPago("tarjeta")}
                  >
                    <span className="metodo-icono">💳</span>
                    <span>Tarjeta</span>
                  </button>
                  <button
                    className={`metodo-btn ${
                      metodoPago === "transferencia" ? "active" : ""
                    }`}
                    onClick={() => setMetodoPago("transferencia")}
                  >
                    <span className="metodo-icono">🏦</span>
                    <span>Transferencia</span>
                  </button>
                </div>

                {metodoPago === "efectivo" && (
                  <div className="input-efectivo">
                    <label>Monto Recibido:</label>
                    <input
                      ref={montoInputRef}
                      type="number"
                      step="0.01"
                      min={ticketCargado.total}
                      className="input-monto-grande"
                      value={montoPagado}
                      onChange={(e) => setMontoPagado(e.target.value)}
                      placeholder="0.00"
                    />
                    {calcularCambio() > 0 && (
                      <div className="cambio-display">
                        <span>Cambio:</span>
                        <span className="cambio-valor">
                          $
                          {calcularCambio().toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                className="btn-cobrar-ticket"
                onClick={cobrarTicket}
                disabled={
                  procesandoPago ||
                  (metodoPago === "efectivo" &&
                    parseFloat(montoPagado) < ticketCargado.total)
                }
              >
                {procesandoPago ? (
                  <>
                    <div className="spinner-small"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCashRegister} />
                    COBRAR $
                    {ticketCargado.total.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="panel-vacio">
              <FontAwesomeIcon icon={faBarcode} size="4x" />
              <p>Escanea un ticket para comenzar</p>
              <span>Usa el escáner o selecciona un ticket de la lista</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Caja;
