// src/pages/Apartados/DetalleApartado.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faUser,
  faPhone,
  faEnvelope,
  faCalendarAlt,
  faTag,
  faMoneyBillWave,
  faHistory,
  faRuler,
  faCheckCircle,
  faTshirt,
  faScissors,
  faSync,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";
import { ApartadoService } from "../../services/supabase/apartadoService";
import CrearApartado from "./CrearApartado";
import "./DetalleApartado.scss";

const DetalleApartado = ({ apartadoId, onClose, onActualizado }) => {
  const [apartado, setApartado] = useState(null);
  const [abonos, setAbonos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState("items"); // items, abonos, medidas
  const [mostrarEditar, setMostrarEditar] = useState(false);

  // Cargar datos del apartado
  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      try {
        const [detalle, historialAbonos] = await Promise.all([
          ApartadoService.obtenerApartadoPorId(apartadoId),
          ApartadoService.obtenerAbonos(apartadoId),
        ]);
        setApartado(detalle);
        setAbonos(historialAbonos);
      } catch (error) {
        console.error("Error al cargar apartado:", error);
        toast.error("Error al cargar el detalle del apartado");
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [apartadoId]);

  // Formatear moneda
  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cantidad || 0);
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Formatear fecha y hora
  const formatearFechaHora = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Obtener icono según tipo de item
  const getTipoIcon = (tipo) => {
    const iconos = {
      producto: faTshirt,
      arreglo: faScissors,
      servicio: faTag,
    };
    return iconos[tipo] || faTag;
  };

  // Obtener color del badge de estado
  const getEstadoBadgeClass = (estado) => {
    const clases = {
      activo: "badge-primary",
      pagado: "badge-success",
      listo: "badge-info",
      entregado: "badge-secondary",
      cancelado: "badge-danger",
    };
    return clases[estado] || "badge-secondary";
  };

  if (cargando) {
    return (
      <div className="modal-overlay">
        <div className="modal-content detalle-apartado-modal">
          <div className="loading-container">
            <FontAwesomeIcon icon={faSync} spin size="2x" />
            <p>Cargando detalle...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!apartado) {
    return null;
  }

  const clienteInfo = apartado.cliente_info || {};
  const items = apartado.items || [];
  const pendiente = (apartado.total || 0) - (apartado.total_abonado || 0);
  const porcentajePagado =
    apartado.total > 0
      ? Math.round((apartado.total_abonado / apartado.total) * 100)
      : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content detalle-apartado-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="header-info">
            <h2>
              <FontAwesomeIcon icon={faTag} /> {apartado.folio}
            </h2>
            <span className={`badge ${getEstadoBadgeClass(apartado.estado)}`}>
              {apartado.estado}
            </span>
          </div>
          <button className="btn-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Resumen superior */}
          <div className="resumen-grid">
            {/* Info cliente */}
            <div className="resumen-card cliente">
              <h4>
                <FontAwesomeIcon icon={faUser} /> Cliente
              </h4>
              <p className="nombre">{clienteInfo.nombre || "Sin nombre"}</p>
              {clienteInfo.telefono && (
                <p>
                  <FontAwesomeIcon icon={faPhone} /> {clienteInfo.telefono}
                </p>
              )}
              {clienteInfo.email && (
                <p>
                  <FontAwesomeIcon icon={faEnvelope} /> {clienteInfo.email}
                </p>
              )}
            </div>

            {/* Info fechas */}
            <div className="resumen-card fechas">
              <h4>
                <FontAwesomeIcon icon={faCalendarAlt} /> Fechas
              </h4>
              <p>
                <span className="label">Creado:</span>
                {formatearFecha(apartado.created_at)}
              </p>
              <p>
                <span className="label">Entrega est.:</span>
                {formatearFecha(apartado.fecha_entrega_estimada)}
              </p>
            </div>

            {/* Info montos */}
            <div className="resumen-card montos">
              <h4>
                <FontAwesomeIcon icon={faMoneyBillWave} /> Montos
              </h4>
              <p>
                <span className="label">Total:</span>
                <strong>{formatearMoneda(apartado.total)}</strong>
              </p>
              <p>
                <span className="label">Abonado:</span>
                <span className="abonado">
                  {formatearMoneda(apartado.total_abonado)}
                </span>
              </p>
              <p>
                <span className="label">Pendiente:</span>
                <span className="pendiente">{formatearMoneda(pendiente)}</span>
              </p>
              {/* Barra de progreso */}
              <div className="progreso-pago">
                <div className="progreso-bar">
                  <div
                    className="progreso-fill"
                    style={{ width: `${porcentajePagado}%` }}
                  />
                </div>
                <span className="progreso-text">
                  {porcentajePagado}% pagado
                </span>
              </div>
            </div>
          </div>

          {/* Notas del cliente */}
          {clienteInfo.notas && (
            <div className="notas-section">
              <h4>Notas</h4>
              <p>{clienteInfo.notas}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="detail-tabs">
            <button
              className={`tab ${tabActiva === "items" ? "active" : ""}`}
              onClick={() => setTabActiva("items")}
            >
              <FontAwesomeIcon icon={faTshirt} /> Items ({items.length})
            </button>
            <button
              className={`tab ${tabActiva === "abonos" ? "active" : ""}`}
              onClick={() => setTabActiva("abonos")}
            >
              <FontAwesomeIcon icon={faHistory} /> Historial de Abonos (
              {abonos.length})
            </button>
          </div>

          {/* Contenido de tabs */}
          <div className="tab-content">
            {tabActiva === "items" && (
              <div className="items-list">
                {items.length === 0 ? (
                  <p className="empty-message">No hay items en este apartado</p>
                ) : (
                  items.map((item, index) => (
                    <div key={item.id || index} className="item-detail">
                      <div className="item-header">
                        <FontAwesomeIcon
                          icon={getTipoIcon(item.tipo_item)}
                          className={`tipo-icon ${item.tipo_item}`}
                        />
                        <div className="item-info">
                          <span className="nombre">{item.producto_nombre}</span>
                          {item.sku && (
                            <span className="sku">SKU: {item.sku}</span>
                          )}
                          <span className={`tipo-badge ${item.tipo_item}`}>
                            {item.tipo_item}
                          </span>
                        </div>
                        <div className="item-precio">
                          <span className="cantidad">x{item.cantidad}</span>
                          <strong>
                            {formatearMoneda(
                              item.precio_unitario * item.cantidad
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* Medidas del item */}
                      {item.medidas &&
                        Object.keys(item.medidas).some(
                          (k) => item.medidas[k]
                        ) && (
                          <div className="item-medidas">
                            <h5>
                              <FontAwesomeIcon icon={faRuler} /> Medidas
                            </h5>
                            <div className="medidas-grid">
                              {item.medidas.busto && (
                                <span>Busto: {item.medidas.busto} cm</span>
                              )}
                              {item.medidas.cintura && (
                                <span>Cintura: {item.medidas.cintura} cm</span>
                              )}
                              {item.medidas.cadera && (
                                <span>Cadera: {item.medidas.cadera} cm</span>
                              )}
                              {item.medidas.espalda && (
                                <span>Espalda: {item.medidas.espalda} cm</span>
                              )}
                              {item.medidas.largo && (
                                <span>Largo: {item.medidas.largo} cm</span>
                              )}
                              {item.medidas.manga && (
                                <span>Manga: {item.medidas.manga} cm</span>
                              )}
                              {item.medidas.otros && (
                                <span>Otros: {item.medidas.otros}</span>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Descripción de arreglo */}
                      {item.descripcion_arreglo && (
                        <div className="item-arreglo">
                          <p>{item.descripcion_arreglo}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {tabActiva === "abonos" && (
              <div className="abonos-list">
                {abonos.length === 0 ? (
                  <p className="empty-message">No hay abonos registrados</p>
                ) : (
                  abonos.map((abono) => (
                    <div key={abono.id} className="abono-item">
                      <div className="abono-icon">
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </div>
                      <div className="abono-info">
                        <span className="folio">{abono.folio_abono}</span>
                        <span className="fecha">
                          {formatearFechaHora(abono.created_at)}
                        </span>
                        <span className="metodo">{abono.metodo_pago}</span>
                      </div>
                      <div className="abono-monto">
                        <strong>{formatearMoneda(abono.monto)}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          {(apartado.estado === "activo" || apartado.estado === "pagado") && (
            <button
              className="btn btn-primary"
              onClick={() => setMostrarEditar(true)}
            >
              <FontAwesomeIcon icon={faEdit} /> Editar Apartado
            </button>
          )}
        </div>
      </div>

      {/* Modal Editar Apartado */}
      {mostrarEditar && (
        <CrearApartado
          tiendaId={apartado?.tienda_id}
          apartadoId={apartadoId}
          onClose={() => setMostrarEditar(false)}
          onCreado={() => {
            setMostrarEditar(false);
            // Recargar datos del apartado
            const cargarDatos = async () => {
              try {
                const [detalle, historialAbonos] = await Promise.all([
                  ApartadoService.obtenerApartadoPorId(apartadoId),
                  ApartadoService.obtenerAbonos(apartadoId),
                ]);
                setApartado(detalle);
                setAbonos(historialAbonos);
                if (onActualizado) onActualizado();
              } catch (error) {
                console.error("Error al recargar apartado:", error);
              }
            };
            cargarDatos();
          }}
        />
      )}
    </div>
  );
};

export default DetalleApartado;
