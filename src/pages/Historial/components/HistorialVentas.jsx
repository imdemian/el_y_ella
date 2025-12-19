import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faBan,
  faSearch,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

const HistorialVentas = ({
  ventas,
  cargando,
  busquedaFolio,
  setBusquedaFolio,
  formatearFecha,
  formatearMoneda,
  formatearMetodoPago,
  getBadgeEstado,
  verDetalle,
  cancelarVenta,
  esAdmin,
}) => {
  // Filtrar ventas por búsqueda de folio
  const ventasFiltradas = ventas.filter((venta) => {
    if (!busquedaFolio.trim()) return true;
    const folio = venta.folio || venta.id.toString();
    return folio.toLowerCase().includes(busquedaFolio.toLowerCase());
  });

  return (
    <>
      {/* Búsqueda por folio */}
      <div className="busqueda-container">
        <div className="busqueda-input-group">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por folio..."
            value={busquedaFolio}
            onChange={(e) => setBusquedaFolio(e.target.value)}
            className="input-busqueda"
          />
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="ventas-tabla-container">
        <div className="tabla-header">
          <h3>Historial de Ventas</h3>
          <span className="total-resultados">
            {ventasFiltradas.length} venta(s) encontrada(s)
          </span>
        </div>

        {cargando ? (
          <div className="cargando-container">
            <div className="spinner"></div>
            <p>Cargando ventas...</p>
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="sin-resultados">
            <FontAwesomeIcon icon={faChartLine} size="3x" />
            <p>No se encontraron ventas</p>
            <span>Intenta ajustar los filtros</span>
          </div>
        ) : (
          <div className="tabla-responsive">
            <table className="ventas-tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tienda</th>
                  <th>Total</th>
                  <th>Método Pago</th>
                  <th>Estado</th>
                  <th>Vendedor</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.map((venta) => {
                  const badge = getBadgeEstado(venta.estado_venta);
                  return (
                    <tr key={venta.id}>
                      <td className="folio-cell">#{venta.folio || venta.id}</td>
                      <td>{formatearFecha(venta.created_at)}</td>
                      <td>{venta.cliente_info?.nombre || "Cliente General"}</td>
                      <td>{venta.tiendas?.nombre || "N/A"}</td>
                      <td className="total-cell">
                        {formatearMoneda(venta.total)}
                      </td>
                      <td>{formatearMetodoPago(venta.metodo_pago)}</td>
                      <td>
                        <span className={`badge ${badge.clase}`}>
                          {badge.texto}
                        </span>
                      </td>
                      <td>ID: {venta.usuario_id || "N/A"}</td>
                      <td className="acciones-cell">
                        <button
                          className="btn-accion btn-ver"
                          onClick={() => verDetalle(venta.id)}
                          title="Ver detalle"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        {esAdmin && venta.estado_venta !== "cancelada" && (
                          <button
                            className="btn-accion btn-cancelar"
                            onClick={() => cancelarVenta(venta.id)}
                            title="Cancelar venta"
                          >
                            <FontAwesomeIcon icon={faBan} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default HistorialVentas;
