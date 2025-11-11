import React, { useState } from "react";
import { InventarioService } from "../../services/supabase/inventarioService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faExchangeAlt,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

export default function TransferenciaModal({ tiendas, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);
  const [tiendaOrigen, setTiendaOrigen] = useState("");
  const [tiendaDestino, setTiendaDestino] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");

  const buscarProducto = async () => {
    if (!busquedaProducto.trim()) return;

    try {
      const resultado = await InventarioService.buscarVariantePorSKU(
        busquedaProducto
      );
      if (resultado) {
        setVarianteSeleccionada(resultado);
        toast.success("Producto encontrado");
      } else {
        toast.error("Producto no encontrado");
      }
    } catch (err) {
      console.error("Error al buscar producto:", err);
      toast.error("Error al buscar producto");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!varianteSeleccionada) {
      toast.error("Debe seleccionar un producto");
      return;
    }

    setLoading(true);
    try {
      await InventarioService.transferirInventario({
        variante_id: varianteSeleccionada.variante_id,
        tienda_origen_id: parseInt(tiendaOrigen),
        tienda_destino_id: parseInt(tiendaDestino),
        cantidad: parseInt(cantidad),
        motivo: motivo || undefined,
      });

      toast.success("Transferencia realizada correctamente");
      onSuccess();
    } catch (error) {
      console.error("Error en transferencia:", error);
      toast.error(error.message || "Error al transferir inventario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transferencia-form">
      <div className="form-group">
        <label>Buscar Producto (SKU):</label>
        <div className="search-product">
          <input
            type="text"
            value={busquedaProducto}
            onChange={(e) => setBusquedaProducto(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && (e.preventDefault(), buscarProducto())
            }
            className="form-control"
            placeholder="Ingrese SKU"
          />
          <button
            type="button"
            onClick={buscarProducto}
            className="btn btn-secondary"
          >
            <FontAwesomeIcon icon={faSearch} />
          </button>
        </div>
      </div>

      {varianteSeleccionada && (
        <div className="producto-seleccionado">
          <h4>{varianteSeleccionada.variantes_producto?.productos?.nombre}</h4>
          <p>SKU: {varianteSeleccionada.variantes_producto?.sku}</p>
          <p>Stock disponible: {varianteSeleccionada.cantidad_disponible}</p>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Tienda Origen:</label>
          <select
            value={tiendaOrigen}
            onChange={(e) => setTiendaOrigen(e.target.value)}
            className="form-control"
            required
          >
            <option value="">Seleccionar...</option>
            {tiendas.map((tienda) => (
              <option key={tienda.id} value={tienda.id}>
                {tienda.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tienda Destino:</label>
          <select
            value={tiendaDestino}
            onChange={(e) => setTiendaDestino(e.target.value)}
            className="form-control"
            required
          >
            <option value="">Seleccionar...</option>
            {tiendas
              .filter((t) => t.id !== parseInt(tiendaOrigen))
              .map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Cantidad a Transferir:</label>
        <input
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="form-control"
          required
        />
      </div>

      <div className="form-group">
        <label>Motivo:</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="form-control"
          rows="3"
          placeholder="Motivo de la transferencia"
        />
      </div>

      <div className="modal-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Transfiriendo...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faExchangeAlt} /> Transferir
            </>
          )}
        </button>
      </div>
    </form>
  );
}
