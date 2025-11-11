import React, { useState } from "react";
import { InventarioService } from "../../services/supabase/inventarioService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faSpinner,
  faCheckCircle,
  faBoxes,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

const AgregarProductoModal = ({ tiendaId, tiendaNombre, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [skuBusqueda, setSkuBusqueda] = useState("");
  const [productoEncontrado, setProductoEncontrado] = useState(null);
  const [resultadosMultiples, setResultadosMultiples] = useState([]);
  const [stockInicial, setStockInicial] = useState(0);
  const [motivo, setMotivo] = useState("");

  const buscarProducto = async () => {
    if (!skuBusqueda.trim()) {
      toast.warning("Por favor ingresa un SKU");
      return;
    }

    setBuscando(true);
    setResultadosMultiples([]);
    try {
      const response = await InventarioService.buscarVariantePorSKU(
        skuBusqueda.trim()
      );

      console.log("Respuesta de búsqueda:", response);

      if (response) {
        // Si es un array (múltiples resultados)
        if (Array.isArray(response)) {
          setResultadosMultiples(response);
          toast.info(
            `Se encontraron ${response.length} variantes. Selecciona una.`
          );
        }
        // Si es un objeto (resultado único)
        else if (response.id) {
          setProductoEncontrado(response);
          toast.success("Producto encontrado");
        } else {
          toast.error("No se encontró ningún producto con ese SKU");
          setProductoEncontrado(null);
        }
      } else {
        toast.error("No se encontró ningún producto con ese SKU");
        setProductoEncontrado(null);
      }
    } catch (error) {
      console.error("Error al buscar producto:", error);
      toast.error("Error al buscar el producto");
      setProductoEncontrado(null);
    } finally {
      setBuscando(false);
    }
  };

  const seleccionarVariante = (variante) => {
    setProductoEncontrado(variante);
    setResultadosMultiples([]);
    toast.success("Producto seleccionado");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!productoEncontrado) {
      toast.warning("Primero busca un producto");
      return;
    }

    if (stockInicial < 0) {
      toast.warning("El stock inicial no puede ser negativo");
      return;
    }

    setLoading(true);
    try {
      await InventarioService.crearInventarioTienda({
        tienda_id: tiendaId,
        variante_id: productoEncontrado.id,
        stock_inicial: stockInicial,
        motivo: motivo || "Inventario inicial",
      });

      toast.success("Producto agregado al inventario correctamente");
      onSuccess();
    } catch (error) {
      console.error("Error al agregar producto:", error);
      toast.error(
        error.message || "Error al agregar el producto al inventario"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !productoEncontrado) {
      e.preventDefault();
      buscarProducto();
    }
  };

  return (
    <form className="agregar-producto-form" onSubmit={handleSubmit}>
      <div className="form-info">
        <p>
          <strong>Tienda:</strong> {tiendaNombre}
        </p>
      </div>

      {/* Búsqueda de producto */}
      <div className="form-group">
        <label htmlFor="sku-busqueda">
          <FontAwesomeIcon icon={faSearch} /> Buscar Producto por SKU
        </label>
        <div className="search-group">
          <input
            type="text"
            id="sku-busqueda"
            value={skuBusqueda}
            onChange={(e) => setSkuBusqueda(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ingresa el SKU del producto..."
            disabled={productoEncontrado !== null || loading}
          />
          <button
            type="button"
            onClick={buscarProducto}
            disabled={
              buscando || productoEncontrado !== null || !skuBusqueda.trim()
            }
            className="btn-search"
          >
            {buscando ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faSearch} />
            )}
            Buscar
          </button>
        </div>
      </div>

      {/* Resultados múltiples */}
      {resultadosMultiples.length > 0 && (
        <div className="resultados-multiples">
          <h4>Se encontraron {resultadosMultiples.length} variantes:</h4>
          <div className="variantes-list">
            {resultadosMultiples.map((variante) => (
              <div
                key={variante.id}
                className="variante-item"
                onClick={() => seleccionarVariante(variante)}
              >
                <div className="variante-info">
                  <strong>{variante.sku}</strong>
                  <span>{variante.productos?.nombre}</span>
                  {variante.atributos && (
                    <span className="atributos">
                      {Object.entries(variante.atributos)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(", ")}
                    </span>
                  )}
                </div>
                <div className="variante-precio">
                  ${variante.precio?.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Producto encontrado */}
      {productoEncontrado && (
        <>
          <div className="producto-encontrado">
            <div className="producto-header">
              <FontAwesomeIcon icon={faCheckCircle} className="check-icon" />
              <h4>Producto Encontrado</h4>
            </div>
            <div className="producto-detalles">
              <p>
                <strong>SKU:</strong> {productoEncontrado.sku}
              </p>
              <p>
                <strong>Producto:</strong>{" "}
                {productoEncontrado.productos?.nombre || "N/A"}
              </p>
              {productoEncontrado.atributos && (
                <p>
                  <strong>Variante:</strong>{" "}
                  {Object.entries(productoEncontrado.atributos)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ")}
                </p>
              )}
              <p>
                <strong>Precio:</strong> $
                {productoEncontrado.precio?.toFixed(2) || "0.00"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProductoEncontrado(null);
                setSkuBusqueda("");
              }}
              className="btn-cambiar"
            >
              Buscar otro producto
            </button>
          </div>

          {/* Formulario de inventario */}
          <div className="form-group">
            <label htmlFor="stock-inicial">
              <FontAwesomeIcon icon={faBoxes} /> Stock Inicial *
            </label>
            <input
              type="number"
              id="stock-inicial"
              value={stockInicial}
              onChange={(e) => setStockInicial(Number(e.target.value))}
              min="0"
              required
              placeholder="Cantidad inicial en inventario"
            />
            <small>Cantidad de unidades que agregarás al inventario</small>
          </div>

          <div className="form-group">
            <label htmlFor="motivo">Motivo (opcional)</label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows="3"
              placeholder="Ej: Inventario inicial, Compra a proveedor, Devolución..."
            />
            <small className="info-text">
              💡 El stock mínimo se gestiona a nivel global en el inventario
              general
            </small>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Agregando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faBoxes} /> Agregar al Inventario
                </>
              )}
            </button>
          </div>
        </>
      )}
    </form>
  );
};

export default AgregarProductoModal;
