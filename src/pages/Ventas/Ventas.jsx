import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faTrash,
  faPlus,
  faMinus,
  faSearch,
  faCashRegister,
  faReceipt,
  faBarcode,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { VentaService } from "../../services/supabase/ventaService";
import { VarianteService } from "../../services/supabase/varianteService";
import BasicModal from "../../components/BasicModal/BasicModal";
import "./Ventas.scss";

const Ventas = () => {
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [montoPagado, setMontoPagado] = useState("");
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  const searchInputRef = useRef(null);

  // Auto-focus en el input de búsqueda al cargar
  useEffect(() => {
    console.log("🔍 [DEBUG] Componente Ventas montado");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Buscar variantes
  const handleBuscar = async (termino) => {
    console.log("🔍 [DEBUG] handleBuscar llamado con:", termino);

    if (!termino.trim()) {
      setResultadosBusqueda([]);
      return;
    }

    setLoading(true);
    try {
      console.log("🔍 [DEBUG] Llamando a VentaService.buscarVariantes...");
      const variantes = await VentaService.buscarVariantes(termino);
      console.log("✅ [DEBUG] Variantes encontradas:", variantes);
      setResultadosBusqueda(variantes);
    } catch (error) {
      console.error("❌ [DEBUG] Error en buscarVariantes:", error);
      // Si el error indica que no hay inventario, mostrar mensaje específico
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
    } finally {
      setLoading(false);
    }
  };

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
  }, [busqueda]);

  // Agregar producto al carrito
  const agregarAlCarrito = (variante) => {
    const itemExistente = carrito.find((item) => item.id === variante.id);

    if (itemExistente) {
      if (itemExistente.cantidad >= variante.stock_actual) {
        toast.warning("No hay suficiente stock disponible");
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.id === variante.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      setCarrito([
        ...carrito,
        {
          id: variante.id,
          sku: variante.sku,
          nombre: variante.nombre_producto,
          atributos: variante.atributos,
          precio: variante.precio,
          cantidad: 1,
          stock_disponible: variante.stock_actual,
        },
      ]);
    }

    toast.success("Producto agregado al carrito");
    setBusqueda("");
    setResultadosBusqueda([]);

    // Volver a enfocar el input de búsqueda
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

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
  };

  // Limpiar carrito
  const limpiarCarrito = () => {
    setCarrito([]);
    toast.info("Carrito limpiado");
  };

  // Calcular totales
  const calcularSubtotal = () => {
    return carrito.reduce(
      (total, item) => total + item.precio * item.cantidad,
      0
    );
  };

  const calcularTotal = () => {
    return calcularSubtotal(); // Aquí podrías agregar impuestos o descuentos
  };

  // Procesar venta
  const procesarVenta = async () => {
    console.log("💰 [DEBUG] procesarVenta iniciado");

    if (carrito.length === 0) {
      toast.warning("El carrito está vacío");
      return;
    }

    const total = calcularTotal();
    const pago = parseFloat(montoPagado) || 0;

    if (metodoPago === "efectivo" && pago < total) {
      toast.error("El monto pagado es insuficiente");
      return;
    }

    setProcesandoVenta(true);

    try {
      const ventaData = {
        items: carrito.map((item) => ({
          variante_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          subtotal: item.precio * item.cantidad,
        })),
        subtotal: calcularSubtotal(),
        total: total,
        metodo_pago: metodoPago,
        monto_pagado: metodoPago === "efectivo" ? pago : total,
      };

      console.log("💰 [DEBUG] Datos de venta a enviar:", ventaData);
      console.log("💰 [DEBUG] Llamando a VentaService.crearVenta...");

      const resultado = await VentaService.crearVenta(ventaData);

      console.log("✅ [DEBUG] Venta creada exitosamente:", resultado);

      toast.success(`Venta #${resultado.id} completada exitosamente`);

      // Limpiar todo
      setCarrito([]);
      setMontoPagado("");
      setMetodoPago("efectivo");
      setShowCheckoutModal(false);

      // Mostrar cambio si es efectivo
      if (metodoPago === "efectivo" && pago > total) {
        const cambio = pago - total;
        toast.info(
          `Cambio: $${cambio.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
          })}`
        );
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error al procesar venta:", error);
      toast.error(error.message);
    } finally {
      setProcesandoVenta(false);
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
    <div className="ventas-page">
      <div className="ventas-container">
        {/* Panel izquierdo - Búsqueda y productos */}
        <div className="panel-productos">
          <div className="panel-header">
            <h2>
              <FontAwesomeIcon icon={faShoppingCart} /> Punto de Venta
            </h2>
          </div>

          {/* Búsqueda por código de barras */}
          <div className="search-section">
            {/* Búsqueda por nombre */}
            <div className="search-input-wrapper">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre o SKU..."
                className="search-input"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  className="clear-search"
                  onClick={() => {
                    setBusqueda("");
                    setResultadosBusqueda([]);
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
          </div>

          {/* Resultados de búsqueda */}
          {loading ? (
            <div className="loading-results">
              <div className="spinner"></div>
              <p>Buscando productos...</p>
            </div>
          ) : resultadosBusqueda.length > 0 ? (
            <div className="resultados-busqueda">
              <p className="resultados-titulo">
                {resultadosBusqueda.length} resultado(s) encontrado(s)
              </p>
              <div className="productos-grid">
                {resultadosBusqueda.map((variante) => (
                  <div
                    key={variante.id}
                    className="producto-card"
                    onClick={() => agregarAlCarrito(variante)}
                  >
                    <div className="producto-info">
                      <h4>{variante.nombre_producto}</h4>
                      {variante.atributos && (
                        <p className="atributos">
                          {formatAtributos(variante.atributos)}
                        </p>
                      )}
                      <p className="sku">SKU: {variante.sku}</p>
                    </div>
                    <div className="producto-detalles">
                      <p className="precio">
                        $
                        {variante.precio.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p
                        className={`stock ${
                          variante.stock_actual <= 5 ? "bajo" : ""
                        }`}
                      >
                        Stock: {variante.stock_actual}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : busqueda ? (
            <div className="no-resultados">
              <FontAwesomeIcon icon={faSearch} size="3x" />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <div className="instrucciones">
              <FontAwesomeIcon icon={faBarcode} size="3x" />
              <h3>Escanea o busca productos</h3>
              <p>
                Utiliza el escáner de códigos de barras o busca productos por
                nombre o SKU
              </p>
            </div>
          )}
        </div>

        {/* Panel derecho - Carrito */}
        <div className="panel-carrito">
          <div className="carrito-header">
            <h3>
              <FontAwesomeIcon icon={faShoppingCart} /> Carrito de Compra
            </h3>
            {carrito.length > 0 && (
              <button className="btn-limpiar" onClick={limpiarCarrito}>
                <FontAwesomeIcon icon={faTrash} /> Limpiar
              </button>
            )}
          </div>

          <div className="carrito-items">
            {carrito.length === 0 ? (
              <div className="carrito-vacio">
                <FontAwesomeIcon icon={faShoppingCart} size="3x" />
                <p>El carrito está vacío</p>
                <span>Agrega productos para comenzar la venta</span>
              </div>
            ) : (
              carrito.map((item) => (
                <div key={item.id} className="carrito-item">
                  <div className="item-info">
                    <h4>{item.nombre}</h4>
                    {item.atributos && (
                      <p className="item-atributos">
                        {formatAtributos(item.atributos)}
                      </p>
                    )}
                    <p className="item-precio">
                      $
                      {item.precio.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="item-controles">
                    <div className="cantidad-control">
                      <button
                        className="btn-cantidad"
                        onClick={() =>
                          actualizarCantidad(item.id, item.cantidad - 1)
                        }
                      >
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock_disponible}
                        value={item.cantidad}
                        onChange={(e) =>
                          actualizarCantidad(
                            item.id,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="input-cantidad"
                      />
                      <button
                        className="btn-cantidad"
                        onClick={() =>
                          actualizarCantidad(item.id, item.cantidad + 1)
                        }
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>

                    <button
                      className="btn-eliminar"
                      onClick={() => eliminarDelCarrito(item.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>

                  <div className="item-subtotal">
                    $
                    {(item.precio * item.cantidad).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {carrito.length > 0 && (
            <>
              <div className="carrito-totales">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>
                    $
                    {calcularSubtotal().toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="total-row total-final">
                  <span>Total:</span>
                  <span>
                    $
                    {calcularTotal().toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <button
                className="btn-finalizar"
                onClick={() => setShowCheckoutModal(true)}
              >
                <FontAwesomeIcon icon={faCashRegister} /> Finalizar Venta
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal de checkout */}
      <BasicModal
        show={showCheckoutModal}
        setShow={setShowCheckoutModal}
        title={
          <div className="modal-title-checkout">
            <FontAwesomeIcon icon={faReceipt} />
            <span>Finalizar Venta</span>
          </div>
        }
      >
        <div className="checkout-modal-content">
          <div className="checkout-resumen">
            <h3>Resumen de la Venta</h3>
            <div className="resumen-items">
              {carrito.map((item) => (
                <div key={item.id} className="resumen-item">
                  <span>
                    {item.nombre} x{item.cantidad}
                  </span>
                  <span>
                    $
                    {(item.precio * item.cantidad).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
            <div className="resumen-total">
              <span>Total a Pagar:</span>
              <span className="total-monto">
                $
                {calcularTotal().toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="checkout-pago">
            <div className="form-group">
              <label>Método de Pago:</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="select-metodo"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            {metodoPago === "efectivo" && (
              <div className="form-group">
                <label>Monto Recibido:</label>
                <input
                  type="number"
                  step="0.01"
                  min={calcularTotal()}
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value)}
                  placeholder="0.00"
                  className="input-monto"
                  autoFocus
                />
                {montoPagado && parseFloat(montoPagado) >= calcularTotal() && (
                  <p className="cambio-info">
                    Cambio: $
                    {(parseFloat(montoPagado) - calcularTotal()).toLocaleString(
                      "es-MX",
                      { minimumFractionDigits: 2 }
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="checkout-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowCheckoutModal(false)}
              disabled={procesandoVenta}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={procesarVenta}
              disabled={procesandoVenta}
            >
              {procesandoVenta ? (
                <>
                  <div className="spinner-small"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCashRegister} />
                  Confirmar Venta
                </>
              )}
            </button>
          </div>
        </div>
      </BasicModal>
    </div>
  );
};

export default Ventas;
