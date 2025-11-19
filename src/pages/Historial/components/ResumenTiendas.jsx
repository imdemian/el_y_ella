import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faStore } from "@fortawesome/free-solid-svg-icons";

const ResumenTiendas = ({ ventas, tiendas, cargando, formatearMoneda }) => {
  // Calcular resumen por tienda
  const calcularResumenTiendas = () => {
    const ventasCompletadas = ventas.filter(
      (v) => v.estado_venta === "completada"
    );

    const resumenPorTienda = {};

    ventasCompletadas.forEach((venta) => {
      const tiendaId = venta.tienda_id;
      if (!resumenPorTienda[tiendaId]) {
        const tienda = tiendas.find((t) => t.id === tiendaId);
        resumenPorTienda[tiendaId] = {
          tienda_id: tiendaId,
          tienda_nombre:
            tienda?.nombre || venta.tiendas?.nombre || `ID: ${tiendaId}`,
          tienda_direccion:
            tienda?.direccion || venta.tiendas?.direccion || "N/A",
          total_ventas: 0,
          num_ventas: 0,
          ticket_promedio: 0,
          total_productos: 0,
        };
      }

      resumenPorTienda[tiendaId].total_ventas += venta.total;
      resumenPorTienda[tiendaId].num_ventas += 1;

      // Calcular productos vendidos
      const itemsVenta = venta.ventas_items || [];
      const cantidadVenta = itemsVenta.reduce(
        (sum, item) => sum + (item.cantidad || 0),
        0
      );
      resumenPorTienda[tiendaId].total_productos += cantidadVenta;
    });

    // Calcular ticket promedio
    Object.values(resumenPorTienda).forEach((tienda) => {
      tienda.ticket_promedio =
        tienda.num_ventas > 0 ? tienda.total_ventas / tienda.num_ventas : 0;
    });

    return Object.values(resumenPorTienda).sort(
      (a, b) => b.total_ventas - a.total_ventas
    );
  };

  return (
    <div className="resumen-tiendas">
      <div className="tiendas-header">
        <h3>🏪 Resumen de Ventas por Tienda</h3>
        <p className="tiendas-subtitle">
          Rendimiento y estadísticas por sucursal
        </p>
      </div>

      {cargando ? (
        <div className="cargando-container">
          <div className="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      ) : ventas.length === 0 ? (
        <div className="sin-resultados">
          <FontAwesomeIcon icon={faChartLine} size="3x" />
          <p>No hay ventas en este período</p>
          <span>Selecciona un rango de fechas con ventas</span>
        </div>
      ) : (
        <div className="tiendas-grid">
          {calcularResumenTiendas().map((tienda, index) => (
            <div key={tienda.tienda_id} className="tienda-card">
              <div className="tienda-ranking">#{index + 1}</div>
              <div className="tienda-header-card">
                <div className="tienda-icono">
                  <FontAwesomeIcon icon={faStore} />
                </div>
                <div className="tienda-info">
                  <div className="tienda-nombre">{tienda.tienda_nombre}</div>
                  <div className="tienda-direccion">
                    {tienda.tienda_direccion}
                  </div>
                </div>
              </div>

              <div className="tienda-stats">
                <div className="tienda-stat-row">
                  <div className="tienda-stat">
                    <span className="stat-label">Ventas</span>
                    <span className="stat-valor">{tienda.num_ventas}</span>
                  </div>
                  <div className="tienda-stat">
                    <span className="stat-label">Productos</span>
                    <span className="stat-valor">{tienda.total_productos}</span>
                  </div>
                </div>

                <div className="tienda-stat-row">
                  <div className="tienda-stat">
                    <span className="stat-label">Ticket Promedio</span>
                    <span className="stat-valor">
                      {formatearMoneda(tienda.ticket_promedio)}
                    </span>
                  </div>
                </div>

                <div className="tienda-stat destacado">
                  <span className="stat-label">Total Vendido</span>
                  <span className="stat-valor-grande">
                    {formatearMoneda(tienda.total_ventas)}
                  </span>
                </div>
              </div>

              {/* Barra de progreso comparativa */}
              <div className="tienda-progreso">
                <div
                  className="progreso-barra"
                  style={{
                    width: `${
                      (tienda.total_ventas /
                        Math.max(
                          ...calcularResumenTiendas().map((t) => t.total_ventas)
                        )) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumenTiendas;
