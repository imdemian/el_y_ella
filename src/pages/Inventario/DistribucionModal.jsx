import React, { useState, useEffect } from "react";
import { InventarioService } from "../../services/supabase/inventarioService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faStore,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

const DistribucionModal = ({ item }) => {
  const [loading, setLoading] = useState(true);
  const [distribucion, setDistribucion] = useState([]);
  const [varianteInfo, setVarianteInfo] = useState(null);

  useEffect(() => {
    const cargarDistribucion = async () => {
      setLoading(true);
      try {
        const response = await InventarioService.obtenerDistribucionVariante(
          item.variante_id
        );

        // La respuesta tiene data (array de tiendas) y variante (info global)
        setDistribucion(response.data || []);
        setVarianteInfo(response.variante || null);

        if (!response.data || response.data.length === 0) {
          toast.info(
            "Este producto no tiene inventario registrado en ninguna tienda"
          );
        }
      } catch (error) {
        console.error("Error al cargar distribución:", error);
        toast.error("Error al cargar la distribución del producto");
        setDistribucion([]);
        setVarianteInfo(null);
      } finally {
        setLoading(false);
      }
    };
    cargarDistribucion();
  }, [item.variante_id]);

  if (loading) {
    return (
      <div className="loading-container">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Cargando distribución...</p>
      </div>
    );
  }

  const stockTotal = distribucion.reduce((sum, d) => sum + (d.stock || 0), 0);

  return (
    <div className="distribucion-modal">
      <div className="producto-info-header">
        <h3>{item.variantes_producto?.productos?.nombre || "Producto"}</h3>
        <p className="producto-detalles">
          <strong>SKU:</strong> {item.variantes_producto?.sku || "N/A"}
          {item.variantes_producto?.atributos && (
            <>
              {" | "}
              {Object.entries(item.variantes_producto.atributos)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")}
            </>
          )}
        </p>
      </div>

      {distribucion.length === 0 ? (
        <div className="empty-state">
          <FontAwesomeIcon icon={faWarehouse} size="3x" />
          <h4>No hay inventario registrado</h4>
          <p>Este producto no tiene stock en ninguna tienda todavía.</p>
          <p
            style={{ fontSize: "0.9rem", color: "#6c757d", marginTop: "1rem" }}
          >
            💡 Para agregarlo, ve a <strong>Vista por Tienda</strong>,
            selecciona una tienda y usa el botón{" "}
            <strong>"Agregar Producto"</strong>.
          </p>
        </div>
      ) : (
        <>
          <div className="distribucion-summary">
            <div className="summary-item">
              <span className="summary-label">Stock Total:</span>
              <span className="summary-value">{stockTotal}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Tiendas con stock:</span>
              <span className="summary-value">{distribucion.length}</span>
            </div>
            {varianteInfo && varianteInfo.inventario_minimo > 0 && (
              <div className="summary-item">
                <span className="summary-label">Stock Mínimo Global:</span>
                <span className="summary-value">
                  {varianteInfo.inventario_minimo}
                </span>
              </div>
            )}
          </div>

          <table className="distribucion-table">
            <thead>
              <tr>
                <th>
                  <FontAwesomeIcon icon={faStore} /> Tienda
                </th>
                <th>Stock</th>
                <th>% del Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {distribucion.map((d) => {
                const porcentaje =
                  stockTotal > 0
                    ? ((d.stock / stockTotal) * 100).toFixed(1)
                    : 0;
                // Comparar contra el inventario mínimo GLOBAL, no por tienda
                const inventarioMinimo = varianteInfo?.inventario_minimo || 0;
                const isLowStock = stockTotal < inventarioMinimo;
                const isOutOfStock = d.stock === 0;

                return (
                  <tr key={d.tienda_id}>
                    <td className="tienda-nombre">{d.tienda_nombre}</td>
                    <td>
                      <strong className={isOutOfStock ? "text-danger" : ""}>
                        {d.stock || 0}
                      </strong>
                    </td>
                    <td>
                      <div className="porcentaje-bar">
                        <div
                          className="porcentaje-fill"
                          style={{ width: `${porcentaje}%` }}
                        />
                        <span className="porcentaje-text">{porcentaje}%</span>
                      </div>
                    </td>
                    <td>
                      {isOutOfStock ? (
                        <span className="badge badge-danger">Sin stock</span>
                      ) : isLowStock ? (
                        <span className="badge badge-warning">
                          Bajo mínimo global
                        </span>
                      ) : (
                        <span className="badge badge-success">Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td>
                  <strong>TOTAL</strong>
                </td>
                <td>
                  <strong>{stockTotal}</strong>
                </td>
                <td>
                  <strong>100%</strong>
                </td>
                <td>-</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
};

export default DistribucionModal;
