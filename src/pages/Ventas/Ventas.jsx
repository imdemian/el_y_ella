import React, { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCashRegister } from "@fortawesome/free-solid-svg-icons";
import { useVentas } from "./hooks/useVentas";
import CarritoVenta from "./components/CarritoVenta";
import PanelPago from "./components/PanelPago";
import ModalProductoExtra from "./components/ModalProductoExtra";
import "./Ventas.scss";

const Ventas = () => {
  const {
    carrito,
    busqueda,
    setBusqueda,
    resultadosBusqueda,
    metodoPago,
    setMetodoPago,
    montoPagado,
    setMontoPagado,
    procesandoVenta,
    tipoCliente,
    setTipoCliente,
    datosCliente,
    setDatosCliente,
    tiendas,
    tiendaSeleccionada,
    setTiendaSeleccionada,
    codigoDescuento,
    setCodigoDescuento,
    descuentoAplicado,
    validandoDescuento,
    mostrarModalProductoExtra,
    datosProductoExtra,
    setDatosProductoExtra,
    searchInputRef,
    agregarAlCarrito,
    incrementarCantidad,
    decrementarCantidad,
    aplicarDescuento,
    eliminarDescuento,
    calcularSubtotal,
    calcularDescuento,
    calcularTotal,
    procesarVenta,
    abrirModalProductoExtra,
    cerrarModalProductoExtra,
    agregarProductoExtra,
  } = useVentas();

  // Auto-focus en el input de búsqueda al cargar
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchInputRef]);

  return (
    <div className="ventas-page">
      <div className="header-ventas">
        <h2>
          <FontAwesomeIcon icon={faCashRegister} /> Punto de Venta
        </h2>
      </div>

      <div className="ventas-container">
        <CarritoVenta
          carrito={carrito}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          resultadosBusqueda={resultadosBusqueda}
          searchInputRef={searchInputRef}
          agregarAlCarrito={agregarAlCarrito}
          incrementarCantidad={incrementarCantidad}
          decrementarCantidad={decrementarCantidad}
          abrirModalProductoExtra={abrirModalProductoExtra}
        />

        <PanelPago
          carrito={carrito}
          tipoCliente={tipoCliente}
          setTipoCliente={setTipoCliente}
          datosCliente={datosCliente}
          setDatosCliente={setDatosCliente}
          codigoDescuento={codigoDescuento}
          setCodigoDescuento={setCodigoDescuento}
          descuentoAplicado={descuentoAplicado}
          validandoDescuento={validandoDescuento}
          aplicarDescuento={aplicarDescuento}
          eliminarDescuento={eliminarDescuento}
          calcularSubtotal={calcularSubtotal()}
          calcularDescuento={calcularDescuento()}
          calcularTotal={calcularTotal()}
          metodoPago={metodoPago}
          setMetodoPago={setMetodoPago}
          montoPagado={montoPagado}
          setMontoPagado={setMontoPagado}
          tiendas={tiendas}
          tiendaSeleccionada={tiendaSeleccionada}
          setTiendaSeleccionada={setTiendaSeleccionada}
          procesandoVenta={procesandoVenta}
          procesarVenta={procesarVenta}
        />
      </div>

      <ModalProductoExtra
        mostrarModal={mostrarModalProductoExtra}
        datosProducto={datosProductoExtra}
        setDatosProducto={setDatosProductoExtra}
        cerrarModal={cerrarModalProductoExtra}
        agregarProducto={agregarProductoExtra}
      />
    </div>
  );
};

export default Ventas;
