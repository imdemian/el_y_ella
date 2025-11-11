import React, { useState } from "react";
import { InventarioService } from "../../services/supabase/inventarioService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

export default function AjusteStockModal({
  item,
  vistaActual,
  tiendaSeleccionada,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [nuevoMinimo, setNuevoMinimo] = useState(item.minimo_stock || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Registrar movimiento
      if (cantidad && parseInt(cantidad) > 0) {
        await InventarioService.registrarMovimiento({
          variante_id: item.variante_id,
          tipo_movimiento: tipoMovimiento,
          cantidad: parseInt(cantidad),
          motivo: motivo || undefined,
          tienda_id:
            vistaActual === "tienda" ? parseInt(tiendaSeleccionada) : undefined,
        });
      }

      // Actualizar mínimo si cambió
      if (nuevoMinimo !== item.minimo_stock) {
        if (vistaActual === "global") {
          await InventarioService.actualizarInventarioGlobal(item.variante_id, {
            minimo_stock: parseInt(nuevoMinimo),
          });
        }
      }

      toast.success("Stock actualizado correctamente");
      onSuccess();
    } catch (error) {
      console.error("Error al actualizar stock:", error);
      toast.error(error.message || "Error al actualizar stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ajuste-stock-form">
      <div className="producto-info">
        <h4>{item.variantes_producto?.productos?.nombre}</h4>
        <p>SKU: {item.variantes_producto?.sku}</p>
        <p className="stock-actual">
          Stock actual: <strong>{item.cantidad_disponible || 0}</strong>
        </p>
      </div>

      <div className="form-group">
        <label>Tipo de Movimiento:</label>
        <select
          value={tipoMovimiento}
          onChange={(e) => setTipoMovimiento(e.target.value)}
          className="form-control"
        >
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
          <option value="ajuste">Ajuste</option>
        </select>
      </div>

      <div className="form-group">
        <label>Cantidad:</label>
        <input
          type="number"
          min="0"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="form-control"
          placeholder="0"
        />
      </div>

      <div className="form-group">
        <label>Motivo:</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="form-control"
          rows="3"
          placeholder="Motivo del ajuste (opcional)"
        />
      </div>

      {vistaActual === "global" && (
        <div className="form-group">
          <label>Stock Mínimo:</label>
          <input
            type="number"
            min="0"
            value={nuevoMinimo}
            onChange={(e) => setNuevoMinimo(e.target.value)}
            className="form-control"
          />
        </div>
      )}

      <div className="modal-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </div>
    </form>
  );
}
