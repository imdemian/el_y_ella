import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";

const ComisionesVendedores = ({
  ventas,
  usuarios,
  cargando,
  formatearMoneda,
}) => {
  // Comisión fija del 3%
  const PORCENTAJE_COMISION = 0.03;

  // Calcular resumen por vendedor (usuario)
  const calcularResumenVendedores = () => {
    const ventasCompletadas = ventas.filter(
      (v) => v.estado_venta === "completada"
    );

    const resumenPorVendedor = {};

    ventasCompletadas.forEach((venta) => {
      const vendedorId = venta.usuario_id;

      if (!resumenPorVendedor[vendedorId]) {
        resumenPorVendedor[vendedorId] = {
          vendedor_id: vendedorId,
          vendedor_nombre:
            usuarios.find((e) => e.id === vendedorId)?.nombre ||
            `Usuario: ${vendedorId}`,
          total_ventas: 0,
          num_ventas: 0,
          comision_total: 0,
        };
      }

      // Calcular comisión del 3% para esta venta
      const comisionVenta = venta.total * PORCENTAJE_COMISION;

      resumenPorVendedor[vendedorId].total_ventas += venta.total;
      resumenPorVendedor[vendedorId].num_ventas += 1;
      resumenPorVendedor[vendedorId].comision_total += comisionVenta;
    });

    return Object.values(resumenPorVendedor).sort(
      (a, b) => b.total_ventas - a.total_ventas
    );
  };

  return (
    <div className="resumen-vendedores">
      <div className="vendedores-header">
        <h3>💼 Resumen de Comisiones por Vendedor</h3>
        <p className="vendedores-subtitle">
          Comisión calculada al 3% sobre ventas completadas
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
        <div className="vendedores-grid">
          {calcularResumenVendedores().map((vendedor, index) => (
            <div key={vendedor.vendedor_id} className="vendedor-card">
              <div className="vendedor-ranking">#{index + 1}</div>
              <div className="vendedor-nombre">{vendedor.vendedor_nombre}</div>
              <div className="vendedor-stats">
                <div className="vendedor-stat">
                  <span className="stat-label">Ventas:</span>
                  <span className="stat-valor">{vendedor.num_ventas}</span>
                </div>
                <div className="vendedor-stat">
                  <span className="stat-label">Total Vendido:</span>
                  <span className="stat-valor">
                    {formatearMoneda(vendedor.total_ventas)}
                  </span>
                </div>
                <div className="vendedor-stat destacado">
                  <span className="stat-label">Comisión (3%):</span>
                  <span className="stat-valor">
                    {formatearMoneda(vendedor.comision_total)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComisionesVendedores;
