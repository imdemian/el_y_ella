import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSync } from "@fortawesome/free-solid-svg-icons";
import "./MisTickets.scss";

const MisTickets = ({ tickets, onClose, onRefresh }) => {
  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente_pago: { text: "Pendiente", class: "pendiente" },
      completada: { text: "Cobrado", class: "completada" },
      cancelada: { text: "Cancelado", class: "cancelada" },
    };
    return badges[estado] || { text: estado, class: "default" };
  };

  return (
    <div className="mis-tickets-overlay" onClick={onClose}>
      <div className="mis-tickets-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>Mis Tickets Generados</h3>
          <div className="header-actions">
            <button
              className="btn-refresh"
              onClick={onRefresh}
              title="Actualizar"
            >
              <FontAwesomeIcon icon={faSync} />
            </button>
            <button className="btn-close" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        <div className="tickets-list">
          {tickets.length === 0 ? (
            <div className="empty-state">
              <p>No tienes tickets generados</p>
              <span>Los tickets que generes aparecerán aquí</span>
            </div>
          ) : (
            tickets.map((ticket) => {
              const badge = getEstadoBadge(ticket.estado_venta);
              return (
                <div key={ticket.id} className="ticket-card">
                  <div className="ticket-header">
                    <span className="ticket-folio">#{ticket.folio}</span>
                    <span className={`ticket-estado ${badge.class}`}>
                      {badge.text}
                    </span>
                  </div>
                  <div className="ticket-body">
                    <div className="ticket-info">
                      <span className="label">Cliente:</span>
                      <span className="value">
                        {ticket.cliente_info?.nombre || "General"}
                      </span>
                    </div>
                    <div className="ticket-info">
                      <span className="label">Total:</span>
                      <span className="value total">
                        $
                        {ticket.total.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="ticket-info">
                      <span className="label">Fecha:</span>
                      <span className="value fecha">
                        {formatFecha(ticket.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MisTickets;
