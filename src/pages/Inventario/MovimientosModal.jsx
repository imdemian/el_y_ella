import React, { useState, useEffect } from "react";
import { InventarioService } from "../../services/supabase/inventarioService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStore, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

export default function MovimientosModal({ varianteId }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    const cargarMovimientos = async () => {
      setLoading(true);
      try {
        const filtros = {
          limit: 100,
          variante_id: varianteId || undefined,
          tipo_movimiento: filtroTipo || undefined,
        };

        const response = await InventarioService.obtenerMovimientos(filtros);
        setMovimientos(response.data || []);
      } catch (error) {
        console.error("Error al cargar movimientos:", error);
        toast.error("Error al cargar movimientos");
      } finally {
        setLoading(false);
      }
    };

    cargarMovimientos();
  }, [varianteId, filtroTipo]);

  const tiposMovimiento = [
    { value: "", label: "Todos" },
    { value: "entrada", label: "Entrada" },
    { value: "salida", label: "Salida" },
    { value: "transferencia", label: "Transferencia" },
    { value: "ajuste", label: "Ajuste" },
    { value: "reserva", label: "Reserva" },
    { value: "liberacion", label: "Liberación" },
  ];

  const getTipoClass = (tipo) => {
    const clases = {
      entrada: "tipo-entrada",
      salida: "tipo-salida",
      transferencia: "tipo-transferencia",
      ajuste: "tipo-ajuste",
      reserva: "tipo-reserva",
      liberacion: "tipo-liberacion",
    };
    return clases[tipo] || "";
  };

  return (
    <div className="movimientos-container">
      <div className="movimientos-filtros">
        <label>Tipo de Movimiento:</label>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="form-control"
        >
          {tiposMovimiento.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        </div>
      ) : (
        <div className="movimientos-lista">
          {movimientos.length === 0 ? (
            <div className="no-data">No hay movimientos registrados</div>
          ) : (
            movimientos.map((mov) => (
              <div key={mov.id} className="movimiento-item">
                <div className="movimiento-header">
                  <span
                    className={`tipo-badge ${getTipoClass(
                      mov.tipo_movimiento
                    )}`}
                  >
                    {mov.tipo_movimiento}
                  </span>
                  <span className="cantidad">
                    {mov.tipo_movimiento === "salida" ? "-" : "+"}
                    {mov.cantidad}
                  </span>
                </div>
                <div className="movimiento-body">
                  <div className="producto-info">
                    <strong>{mov.variantes_producto?.productos?.nombre}</strong>
                    <span className="sku">
                      SKU: {mov.variantes_producto?.sku}
                    </span>
                  </div>
                  {mov.tiendas && (
                    <div className="tienda-info">
                      <FontAwesomeIcon icon={faStore} /> {mov.tiendas.nombre}
                    </div>
                  )}
                  {mov.motivo && <div className="motivo">{mov.motivo}</div>}
                  <div className="movimiento-footer">
                    <span className="usuario">
                      {mov.usuarios?.nombre || "Sistema"}
                    </span>
                    <span className="fecha">
                      {new Date(mov.created_at).toLocaleString("es-MX")}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
