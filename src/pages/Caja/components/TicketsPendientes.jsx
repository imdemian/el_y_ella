import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import "./TicketsPendientes.scss";

const TicketsPendientes = ({ tickets, onSelectTicket, cargando }) => {
  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (cargando) {
    return (
      <div className="tickets-pendientes">
        <div className="pendientes-header">
          <h4>Tickets Pendientes</h4>
        </div>
        <div className="pendientes-loading">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Cargando tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tickets-pendientes">
      <div className="pendientes-header">
        <h4>Tickets Pendientes</h4>
        <span className="count-badge">{tickets.length}</span>
      </div>

      <div className="pendientes-list">
        {tickets.length === 0 ? (
          <div className="empty-state">
            <p>✅ No hay tickets pendientes</p>
            <span>Todos los tickets han sido cobrados</span>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="ticket-card"
              onClick={() => onSelectTicket(ticket.folio)}
            >
              <div className="ticket-header">
                <span className="ticket-folio">#{ticket.folio}</span>
                <span className="ticket-total">
                  $
                  {ticket.total.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="ticket-body">
                <div className="ticket-info">
                  <span className="label">Vendedor:</span>
                  <span className="value">
                    {ticket.usuarios?.nombre || "N/A"}
                  </span>
                </div>
                <div className="ticket-info">
                  <span className="label">Cliente:</span>
                  <span className="value">
                    {ticket.cliente_info?.nombre || "General"}
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
          ))
        )}
      </div>
    </div>
  );
};

export default TicketsPendientes;
