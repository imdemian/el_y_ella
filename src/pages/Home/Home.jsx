import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStore,
  faShoppingCart,
  faClock,
  faChartLine,
  faMoneyBillWave,
  faArrowTrendUp,
  faArrowTrendDown,
} from "@fortawesome/free-solid-svg-icons";
import { VentaService } from "../../services/supabase/ventaService";
import { TiendaService } from "../../services/supabase/tiendaService";
import "./Home.scss";

const Home = () => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [actividadReciente, setActividadReciente] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Obtener fecha de hoy en zona horaria local
      const hoy = new Date();

      // Crear fecha de inicio del día (00:00:00) en hora local
      const inicioDelDia = new Date(hoy);
      inicioDelDia.setHours(0, 0, 0, 0);

      // Crear fecha de fin del día (23:59:59) en hora local
      const finDelDia = new Date(hoy);
      finDelDia.setHours(23, 59, 59, 999);

      // Convertir a ISO string (incluye zona horaria)
      const fechaInicio = inicioDelDia.toISOString();
      const fechaFin = finDelDia.toISOString();

      // Cargar tiendas y ventas del día en paralelo
      const [listaTiendas, ventasDelDia] = await Promise.all([
        TiendaService.obtenerTiendas(),
        VentaService.obtenerVentas({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        }),
      ]);

      // Extraer el array de ventas de la respuesta
      const ventasArray = ventasDelDia?.data || [];

      setTiendas(listaTiendas);
      setVentasHoy(ventasArray);

      // Últimas 10 ventas para actividad reciente
      const recientes = Array.isArray(ventasArray)
        ? [...ventasArray]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10)
        : [];
      setActividadReciente(recientes);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar los datos del dashboard");
    } finally {
      setCargando(false);
    }
  };

  // Calcular resumen por tienda
  const calcularResumenTiendas = () => {
    if (!Array.isArray(tiendas) || !Array.isArray(ventasHoy)) {
      return [];
    }

    return tiendas.map((tienda) => {
      const ventasTienda = ventasHoy.filter((v) => v.tienda_id === tienda.id);
      const ventasCompletadas = ventasTienda.filter(
        (v) => v.estado_venta === "completada"
      );
      const totalVentas = ventasCompletadas.reduce(
        (sum, v) => sum + (v.total || 0),
        0
      );

      return {
        ...tienda,
        numVentas: ventasCompletadas.length,
        totalVentas: totalVentas,
        ventasPendientes: ventasTienda.filter(
          (v) => v.estado_venta === "apartado"
        ).length,
      };
    });
  };

  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cantidad);
  };

  /* const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Mexico_City",
    });
  }; */

  const formatearHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Mexico_City",
    });
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case "completada":
        return "estado-completada";
      case "apartado":
        return "estado-apartado";
      case "cancelada":
        return "estado-cancelada";
      default:
        return "";
    }
  };

  const verDetalleVenta = (ventaId) => {
    navigate(`/historial?venta=${ventaId}`);
  };

  if (cargando) {
    return (
      <div className="home-container">
        <div className="cargando-container">
          <div className="spinner"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const resumenTiendas = calcularResumenTiendas();
  const ventasCompletadas = Array.isArray(ventasHoy)
    ? ventasHoy.filter((v) => v.estado_venta === "completada")
    : [];
  const totalVentasHoy = ventasCompletadas.reduce(
    (sum, v) => sum + (v.total || 0),
    0
  );
  const numTransacciones = ventasCompletadas.length;

  return (
    <div className="home-container">
      {/* Header */}
      <div className="home-header">
        <div>
          <h1>Bienvenido a El y Ella</h1>
          <p className="fecha-actual">
            {new Date().toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* KPIs Generales */}
      <div className="kpis-generales">
        <div className="kpi-card kpi-ventas">
          <div className="kpi-icon">
            <FontAwesomeIcon icon={faMoneyBillWave} />
          </div>
          <div className="kpi-info">
            <p className="kpi-label">Ventas del Día</p>
            <h2 className="kpi-valor">{formatearMoneda(totalVentasHoy)}</h2>
          </div>
        </div>

        <div className="kpi-card kpi-transacciones">
          <div className="kpi-icon">
            <FontAwesomeIcon icon={faShoppingCart} />
          </div>
          <div className="kpi-info">
            <p className="kpi-label">Transacciones</p>
            <h2 className="kpi-valor">{numTransacciones}</h2>
          </div>
        </div>

        <div className="kpi-card kpi-tiendas">
          <div className="kpi-icon">
            <FontAwesomeIcon icon={faStore} />
          </div>
          <div className="kpi-info">
            <p className="kpi-label">Tiendas Activas</p>
            <h2 className="kpi-valor">
              {resumenTiendas.filter((t) => t.numVentas > 0).length}
            </h2>
          </div>
        </div>

        <div className="kpi-card kpi-promedio">
          <div className="kpi-icon">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="kpi-info">
            <p className="kpi-label">Ticket Promedio</p>
            <h2 className="kpi-valor">
              {numTransacciones > 0
                ? formatearMoneda(totalVentasHoy / numTransacciones)
                : "$0.00"}
            </h2>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="home-content">
        {/* Resumen por Tiendas */}
        <div className="seccion-tiendas">
          <div className="seccion-header">
            <h2>
              <FontAwesomeIcon icon={faStore} /> Ventas por Tienda - Hoy
            </h2>
          </div>

          <div className="tiendas-grid">
            {resumenTiendas.map((tienda) => (
              <div key={tienda.id} className="tienda-card">
                <div className="tienda-header">
                  <h3>{tienda.nombre}</h3>
                  {tienda.numVentas > 0 ? (
                    <span className="badge-activa">
                      <FontAwesomeIcon icon={faArrowTrendUp} /> Activa
                    </span>
                  ) : (
                    <span className="badge-inactiva">
                      <FontAwesomeIcon icon={faArrowTrendDown} /> Sin ventas
                    </span>
                  )}
                </div>

                <div className="tienda-stats">
                  <div className="stat">
                    <span className="stat-icon">💰</span>
                    <div>
                      <p className="stat-label">Total Vendido</p>
                      <p className="stat-valor">
                        {formatearMoneda(tienda.totalVentas)}
                      </p>
                    </div>
                  </div>

                  <div className="stat">
                    <span className="stat-icon">🛒</span>
                    <div>
                      <p className="stat-label">Ventas Completadas</p>
                      <p className="stat-valor">{tienda.numVentas}</p>
                    </div>
                  </div>

                  {tienda.ventasPendientes > 0 && (
                    <div className="stat">
                      <span className="stat-icon">⏳</span>
                      <div>
                        <p className="stat-label">Apartados</p>
                        <p className="stat-valor">{tienda.ventasPendientes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {tienda.direccion && (
                  <div className="tienda-ubicacion">
                    <small>📍 {tienda.direccion}</small>
                  </div>
                )}
              </div>
            ))}
          </div>

          {resumenTiendas.length === 0 && (
            <div className="sin-datos">
              <FontAwesomeIcon icon={faStore} size="3x" />
              <p>No hay tiendas registradas</p>
            </div>
          )}
        </div>

        {/* Actividad Reciente */}
        <div className="seccion-actividad">
          <div className="seccion-header">
            <h2>
              <FontAwesomeIcon icon={faClock} /> Actividad Reciente
            </h2>
            <button
              className="btn-ver-todo"
              onClick={() => navigate("/historial")}
            >
              Ver todo
            </button>
          </div>

          <div className="actividad-lista">
            {actividadReciente.length > 0 ? (
              actividadReciente.map((venta) => (
                <div
                  key={venta.id}
                  className="actividad-item"
                  onClick={() => verDetalleVenta(venta.id)}
                >
                  <div className="actividad-icon">
                    <FontAwesomeIcon icon={faShoppingCart} />
                  </div>
                  <div className="actividad-info">
                    <div className="actividad-principal">
                      <span className="actividad-titulo">
                        Venta #{venta.folio || String(venta.id).substring(0, 8)}
                      </span>
                      <span
                        className={`actividad-estado ${obtenerColorEstado(
                          venta.estado_venta
                        )}`}
                      >
                        {venta.estado_venta}
                      </span>
                    </div>
                    <div className="actividad-detalles">
                      <span className="actividad-monto">
                        {formatearMoneda(venta.total)}
                      </span>
                      <span className="actividad-cliente">
                        {venta.cliente_info?.nombre || "Cliente General"}
                      </span>
                      <span className="actividad-hora">
                        {formatearHora(venta.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="sin-datos">
                <FontAwesomeIcon icon={faClock} size="3x" />
                <p>No hay actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
