import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faChartLine,
  faBan,
} from "@fortawesome/free-solid-svg-icons";
import { VentaService } from "../../services/supabase/ventaService";
import { ReportesService } from "../../utils/reportesService";
import HistorialVentas from "./components/HistorialVentas";
import ComisionesVendedores from "./components/ComisionesVendedores";
import ResumenTiendas from "./components/ResumenTiendas";
import "./Historial.scss";

const Historial = () => {
  // Estados para filtros
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtroRapido, setFiltroRapido] = useState("hoy");
  const [estadoFiltro, setEstadoFiltro] = useState(""); // '', 'completada', 'apartado', 'cancelada'
  const [metodoPagoFiltro, setMetodoPagoFiltro] = useState(""); // '', 'efectivo', 'tarjeta', 'transferencia'
  const [busquedaFolio, setBusquedaFolio] = useState("");
  const [tiendaFiltro, setTiendaFiltro] = useState(""); // Filtro por tienda
  const [vendedorFiltro, setVendedorFiltro] = useState(""); // Filtro por vendedor
  const [tabActiva, setTabActiva] = useState("historial"); // 'historial' o 'vendedores'

  // Estados para datos
  const [ventas, setVentas] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [mostrarDetalleModal, setMostrarDetalleModal] = useState(false);

  // Estados para KPIs
  const [kpis, setKpis] = useState({
    totalVentas: 0,
    numeroTransacciones: 0,
    ticketPromedio: 0,
    productosVendidos: 0,
  });

  // Cargar tiendas y usuarios al inicio
  useEffect(() => {
    cargarTiendasYUsuarios();
  }, []);

  // Configurar fechas según filtro rápido
  useEffect(() => {
    const hoy = new Date();
    const formatearFecha = (fecha) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    switch (filtroRapido) {
      case "hoy":
        setFechaInicio(formatearFecha(hoy));
        setFechaFin(formatearFecha(hoy));
        break;
      case "ayer": {
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);
        setFechaInicio(formatearFecha(ayer));
        setFechaFin(formatearFecha(ayer));
        break;
      }
      case "semana": {
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        setFechaInicio(formatearFecha(inicioSemana));
        setFechaFin(formatearFecha(hoy));
        break;
      }
      case "mes": {
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        setFechaInicio(formatearFecha(inicioMes));
        setFechaFin(formatearFecha(hoy));
        break;
      }
      case "personalizado":
        // No hacer nada, el usuario configurará manualmente
        break;
      default:
        break;
    }
  }, [filtroRapido]);

  // Cargar tiendas y usuarios
  const cargarTiendasYUsuarios = async () => {
    try {
      // Importar servicios
      const { TiendaService } = await import(
        "../../services/supabase/tiendaService"
      );
      const { UsuariosService } = await import(
        "../../services/supabase/usuariosService"
      );

      const [listaTiendas, listaUsuarios] = await Promise.all([
        TiendaService.obtenerTiendas(),
        UsuariosService.obtenerUsuarios(),
      ]);

      setTiendas(listaTiendas);
      setUsuarios(listaUsuarios);
    } catch (error) {
      console.error("Error al cargar tiendas/usuarios:", error);
    }
  };

  // Función para cargar ventas
  const cargarVentas = useCallback(async () => {
    setCargando(true);
    try {
      const filtros = {};

      if (fechaInicio) {
        filtros.fecha_inicio = `${fechaInicio}T00:00:00`;
      }
      if (fechaFin) {
        filtros.fecha_fin = `${fechaFin}T23:59:59`;
      }
      if (estadoFiltro) {
        filtros.estado = estadoFiltro;
      }
      if (metodoPagoFiltro) {
        filtros.metodo_pago = metodoPagoFiltro;
      }
      if (tiendaFiltro) {
        filtros.tienda_id = tiendaFiltro;
      }
      if (vendedorFiltro) {
        filtros.usuario_id = vendedorFiltro;
      }

      console.log("📊 Cargando ventas con filtros:", filtros);

      const resultado = await VentaService.obtenerVentas(filtros);
      const ventasData = resultado.data || [];

      setVentas(ventasData);
      calcularKPIs(ventasData);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      toast.error(error.message || "Error al cargar las ventas");
    } finally {
      setCargando(false);
    }
  }, [
    fechaInicio,
    fechaFin,
    estadoFiltro,
    metodoPagoFiltro,
    tiendaFiltro,
    vendedorFiltro,
  ]);

  // Calcular KPIs
  const calcularKPIs = (ventasData) => {
    // Filtrar solo ventas completadas para KPIs
    const ventasCompletadas = ventasData.filter(
      (v) => v.estado_venta === "completada"
    );

    const totalVentas = ventasCompletadas.reduce(
      (sum, venta) => sum + (venta.total || 0),
      0
    );

    const numeroTransacciones = ventasCompletadas.length;

    const ticketPromedio =
      numeroTransacciones > 0 ? totalVentas / numeroTransacciones : 0;

    // Calcular productos vendidos
    const productosVendidos = ventasCompletadas.reduce((sum, venta) => {
      const itemsVenta = venta.ventas_items || [];
      const cantidadVenta = itemsVenta.reduce(
        (itemSum, item) => itemSum + (item.cantidad || 0),
        0
      );
      return sum + cantidadVenta;
    }, 0);

    setKpis({
      totalVentas,
      numeroTransacciones,
      ticketPromedio,
      productosVendidos,
    });
  };

  // Cargar ventas cuando cambien los filtros
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      cargarVentas();
    }
  }, [
    fechaInicio,
    fechaFin,
    estadoFiltro,
    metodoPagoFiltro,
    tiendaFiltro,
    vendedorFiltro,
    cargarVentas,
  ]);

  // Ver detalle de venta
  const verDetalle = async (ventaId) => {
    try {
      const venta = await VentaService.obtenerVentaPorId(ventaId);
      setVentaSeleccionada(venta);
      setMostrarDetalleModal(true);
    } catch (error) {
      console.error("Error al obtener detalle de venta:", error);
      toast.error("Error al cargar el detalle de la venta");
    }
  };

  // Cancelar venta
  const cancelarVenta = async (ventaId) => {
    const confirmar = window.confirm(
      "¿Estás seguro de cancelar esta venta? El inventario será restaurado."
    );

    if (!confirmar) return;

    const motivo = prompt("Motivo de cancelación (opcional):");

    try {
      await VentaService.cancelarVenta(ventaId, motivo);
      toast.success("Venta cancelada exitosamente");
      cargarVentas(); // Recargar lista
      if (mostrarDetalleModal) {
        setMostrarDetalleModal(false);
      }
    } catch (error) {
      console.error("Error al cancelar venta:", error);
      toast.error(error.message || "Error al cancelar la venta");
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Formatear moneda
  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(monto);
  };

  // Obtener badge de estado
  const getBadgeEstado = (estado) => {
    const badges = {
      completada: { clase: "badge-completada", texto: "Completada" },
      apartado: { clase: "badge-apartado", texto: "Apartado" },
      cancelada: { clase: "badge-cancelada", texto: "Cancelada" },
    };
    return badges[estado] || { clase: "", texto: estado };
  };

  // Formatear método de pago
  const formatearMetodoPago = (metodoPago) => {
    if (!metodoPago) return "N/A";
    const metodos = Object.keys(metodoPago);
    return metodos.join(", ").toUpperCase();
  };

  // Formatear atributos de variante
  const formatearAtributos = (atributos) => {
    if (!atributos || typeof atributos !== "object") return "";
    return Object.entries(atributos)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · ");
  };

  // Funciones para generar reportes
  const generarReportePDFTiendas = () => {
    try {
      ReportesService.generarReportePDFPorTienda(
        ventas,
        tiendas,
        usuarios,
        fechaInicio,
        fechaFin
      );
      toast.success("Reporte PDF generado exitosamente");
    } catch (error) {
      console.error("Error al generar reporte PDF:", error);
      toast.error("Error al generar el reporte PDF");
    }
  };

  const generarReportePDFComisiones = () => {
    try {
      ReportesService.generarReportePDFComisiones(
        ventas,
        usuarios,
        tiendas,
        fechaInicio,
        fechaFin,
        0.03 // 3% de comisión
      );
      toast.success("Reporte PDF de comisiones generado exitosamente");
    } catch (error) {
      console.error("Error al generar reporte PDF:", error);
      toast.error("Error al generar el reporte PDF");
    }
  };

  const generarReporteCSVTiendas = () => {
    try {
      ReportesService.generarReporteCSVPorTienda(
        ventas,
        tiendas,
        usuarios,
        fechaInicio,
        fechaFin
      );
      toast.success("Reporte CSV generado exitosamente");
    } catch (error) {
      console.error("Error al generar reporte CSV:", error);
      toast.error("Error al generar el reporte CSV");
    }
  };

  const generarReporteCSVComisiones = () => {
    try {
      ReportesService.generarReporteCSVComisiones(
        ventas,
        usuarios,
        tiendas,
        fechaInicio,
        fechaFin,
        0.03 // 3% de comisión
      );
      toast.success("Reporte CSV de comisiones generado exitosamente");
    } catch (error) {
      console.error("Error al generar reporte CSV:", error);
      toast.error("Error al generar el reporte CSV");
    }
  };

  return (
    <div className="historial-page">
      <div className="historial-header">
        <h1>
          <FontAwesomeIcon icon={faChartLine} /> Dashboard de Ventas
        </h1>
        <p className="historial-subtitle">Analiza tus ventas y rendimiento</p>
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtros-rapidos">
          <button
            className={`filtro-btn ${filtroRapido === "hoy" ? "active" : ""}`}
            onClick={() => setFiltroRapido("hoy")}
          >
            Hoy
          </button>
          <button
            className={`filtro-btn ${filtroRapido === "ayer" ? "active" : ""}`}
            onClick={() => setFiltroRapido("ayer")}
          >
            Ayer
          </button>
          <button
            className={`filtro-btn ${
              filtroRapido === "semana" ? "active" : ""
            }`}
            onClick={() => setFiltroRapido("semana")}
          >
            Esta Semana
          </button>
          <button
            className={`filtro-btn ${filtroRapido === "mes" ? "active" : ""}`}
            onClick={() => setFiltroRapido("mes")}
          >
            Este Mes
          </button>
          <button
            className={`filtro-btn ${
              filtroRapido === "personalizado" ? "active" : ""
            }`}
            onClick={() => setFiltroRapido("personalizado")}
          >
            <FontAwesomeIcon icon={faCalendar} /> Personalizado
          </button>
        </div>

        {filtroRapido === "personalizado" && (
          <div className="filtros-fechas">
            <div className="input-group">
              <label>Fecha Inicio:</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="input-fecha"
              />
            </div>
            <div className="input-group">
              <label>Fecha Fin:</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="input-fecha"
              />
            </div>
          </div>
        )}

        <div className="filtros-adicionales">
          <div className="input-group">
            <label>Estado:</label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="select-filtro"
            >
              <option value="">Todos</option>
              <option value="completada">Completadas</option>
              <option value="apartado">Apartados</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>

          <div className="input-group">
            <label>Método de Pago:</label>
            <select
              value={metodoPagoFiltro}
              onChange={(e) => setMetodoPagoFiltro(e.target.value)}
              className="select-filtro"
            >
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <div className="input-group">
            <label>Tienda:</label>
            <select
              value={tiendaFiltro}
              onChange={(e) => setTiendaFiltro(e.target.value)}
              className="select-filtro"
            >
              <option value="">Todas</option>
              {tiendas.map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Vendedor:</label>
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="select-filtro"
            >
              <option value="">Todos</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis-container">
        <div className="kpi-card">
          <div className="kpi-icono">💰</div>
          <div className="kpi-info">
            <span className="kpi-label">Total Ventas</span>
            <span className="kpi-valor">
              {formatearMoneda(kpis.totalVentas)}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icono">🧾</div>
          <div className="kpi-info">
            <span className="kpi-label">Transacciones</span>
            <span className="kpi-valor">{kpis.numeroTransacciones}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icono">📊</div>
          <div className="kpi-info">
            <span className="kpi-label">Ticket Promedio</span>
            <span className="kpi-valor">
              {formatearMoneda(kpis.ticketPromedio)}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icono">📦</div>
          <div className="kpi-info">
            <span className="kpi-label">Productos Vendidos</span>
            <span className="kpi-valor">{kpis.productosVendidos}</span>
          </div>
        </div>
      </div>

      {/* Botones de Reportes */}
      <div className="reportes-container">
        <h3>📄 Generar Reportes</h3>
        <div className="reportes-botones">
          <button
            className="btn-reporte btn-pdf"
            onClick={generarReportePDFTiendas}
            disabled={ventas.length === 0}
          >
            📑 PDF Ventas por Tienda
          </button>
          <button
            className="btn-reporte btn-pdf"
            onClick={generarReportePDFComisiones}
            disabled={ventas.length === 0}
          >
            📑 PDF Comisiones
          </button>
          <button
            className="btn-reporte btn-csv"
            onClick={generarReporteCSVTiendas}
            disabled={ventas.length === 0}
          >
            📊 CSV Ventas por Tienda
          </button>
          <button
            className="btn-reporte btn-csv"
            onClick={generarReporteCSVComisiones}
            disabled={ventas.length === 0}
          >
            📊 CSV Comisiones
          </button>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${tabActiva === "historial" ? "active" : ""}`}
          onClick={() => setTabActiva("historial")}
        >
          📋 Historial de Ventas
        </button>
        <button
          className={`tab-btn ${tabActiva === "vendedores" ? "active" : ""}`}
          onClick={() => setTabActiva("vendedores")}
        >
          💼 Comisiones por Vendedor
        </button>
        <button
          className={`tab-btn ${tabActiva === "tiendas" ? "active" : ""}`}
          onClick={() => setTabActiva("tiendas")}
        >
          🏪 Resumen por Tienda
        </button>
      </div>

      {/* Contenido del Tab: Historial de Ventas */}
      {tabActiva === "historial" && (
        <HistorialVentas
          ventas={ventas}
          cargando={cargando}
          busquedaFolio={busquedaFolio}
          setBusquedaFolio={setBusquedaFolio}
          formatearFecha={formatearFecha}
          formatearMoneda={formatearMoneda}
          formatearMetodoPago={formatearMetodoPago}
          getBadgeEstado={getBadgeEstado}
          verDetalle={verDetalle}
          cancelarVenta={cancelarVenta}
        />
      )}

      {/* Contenido del Tab: Comisiones por Vendedor */}
      {tabActiva === "vendedores" && (
        <ComisionesVendedores
          ventas={ventas}
          usuarios={usuarios}
          cargando={cargando}
          formatearMoneda={formatearMoneda}
        />
      )}

      {/* Contenido del Tab: Resumen por Tienda */}
      {tabActiva === "tiendas" && (
        <ResumenTiendas
          ventas={ventas}
          tiendas={tiendas}
          cargando={cargando}
          formatearMoneda={formatearMoneda}
        />
      )}

      {/* Modal de Detalle */}
      {mostrarDetalleModal && ventaSeleccionada && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarDetalleModal(false)}
        >
          <div className="modal-detalle" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Detalle de Venta #
                {ventaSeleccionada.folio || ventaSeleccionada.id}
              </h2>
              <button
                className="btn-cerrar"
                onClick={() => setMostrarDetalleModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Información General */}
              <div className="detalle-seccion">
                <h3>Información General</h3>
                <div className="detalle-grid">
                  <div className="detalle-item">
                    <span className="detalle-label">Fecha:</span>
                    <span className="detalle-valor">
                      {formatearFecha(ventaSeleccionada.created_at)}
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Estado:</span>
                    <span
                      className={`badge ${
                        getBadgeEstado(ventaSeleccionada.estado_venta).clase
                      }`}
                    >
                      {getBadgeEstado(ventaSeleccionada.estado_venta).texto}
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Tienda:</span>
                    <span className="detalle-valor">
                      {ventaSeleccionada.tiendas?.nombre || "N/A"}
                    </span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Usuario ID:</span>
                    <span className="detalle-valor">
                      {ventaSeleccionada.usuario_id || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Información del Cliente */}
              {ventaSeleccionada.cliente_info && (
                <div className="detalle-seccion">
                  <h3>Cliente</h3>
                  <div className="detalle-grid">
                    <div className="detalle-item">
                      <span className="detalle-label">Nombre:</span>
                      <span className="detalle-valor">
                        {ventaSeleccionada.cliente_info.nombre}
                      </span>
                    </div>
                    <div className="detalle-item">
                      <span className="detalle-label">Teléfono:</span>
                      <span className="detalle-valor">
                        {ventaSeleccionada.cliente_info.telefono}
                      </span>
                    </div>
                    {ventaSeleccionada.cliente_info.email && (
                      <div className="detalle-item">
                        <span className="detalle-label">Email:</span>
                        <span className="detalle-valor">
                          {ventaSeleccionada.cliente_info.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Productos */}
              <div className="detalle-seccion">
                <h3>Productos</h3>
                <table className="detalle-tabla">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Variante</th>
                      <th>Precio</th>
                      <th>Cantidad</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventaSeleccionada.ventas_items?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.variantes_producto?.sku}</td>
                        <td>{item.variantes_producto?.productos?.nombre}</td>
                        <td>
                          {formatearAtributos(
                            item.variantes_producto?.atributos
                          )}
                        </td>
                        <td>{formatearMoneda(item.precio_unitario)}</td>
                        <td>{item.cantidad}</td>
                        <td>{formatearMoneda(item.subtotal_linea)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="detalle-seccion">
                <div className="detalle-totales">
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>{formatearMoneda(ventaSeleccionada.subtotal)}</span>
                  </div>
                  <div className="total-row">
                    <span>Descuento:</span>
                    <span>{formatearMoneda(ventaSeleccionada.descuento)}</span>
                  </div>
                  <div className="total-row">
                    <span>Impuestos:</span>
                    <span>{formatearMoneda(ventaSeleccionada.impuestos)}</span>
                  </div>
                  <div className="total-row total-final">
                    <span>Total:</span>
                    <span>{formatearMoneda(ventaSeleccionada.total)}</span>
                  </div>
                  <div className="total-row">
                    <span>Método de Pago:</span>
                    <span>
                      {formatearMetodoPago(ventaSeleccionada.metodo_pago)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {ventaSeleccionada.notas && (
                <div className="detalle-seccion">
                  <h3>Notas</h3>
                  <p className="detalle-notas">{ventaSeleccionada.notas}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {ventaSeleccionada.estado_venta !== "cancelada" && (
                <button
                  className="btn-modal btn-cancelar-venta"
                  onClick={() => cancelarVenta(ventaSeleccionada.id)}
                >
                  <FontAwesomeIcon icon={faBan} /> Cancelar Venta
                </button>
              )}
              <button
                className="btn-modal btn-cerrar-modal"
                onClick={() => setMostrarDetalleModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Historial;
