import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan } from "@fortawesome/free-solid-svg-icons";
import { VentaService } from "../../../services/supabase/ventaService";

const DetalleVentaModal = ({
  ventaSeleccionada,
  mostrarModal,
  cerrarModal,
  formatearFecha,
  formatearMoneda,
  formatearMetodoPago,
  getBadgeEstado,
  formatearAtributos,
  cancelarVenta,
  esAdmin,
  onVentaActualizada,
}) => {
  const [editandoVendedor, setEditandoVendedor] = useState(false);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
  const [vendedoresTienda, setVendedoresTienda] = useState([]);

  // Cargar vendedores de la tienda
  const cargarVendedoresTienda = async () => {
    try {
      const { UsuariosService } = await import(
        "../../../services/supabase/usuariosService"
      );
      const lista = await UsuariosService.obtenerUsuarios();
      setVendedoresTienda(lista);
    } catch (error) {
      console.error("Error al cargar vendedores:", error);
      toast.error("Error al cargar vendedores");
    }
  };

  // Iniciar edición de vendedor
  const iniciarEdicionVendedor = async () => {
    if (!ventaSeleccionada?.tienda_id) return;
    setVendedorSeleccionado(ventaSeleccionada.usuario_id?.toString() || "");
    await cargarVendedoresTienda(ventaSeleccionada.tienda_id);
    setEditandoVendedor(true);
  };

  // Guardar cambio de vendedor
  const guardarCambioVendedor = async () => {
    if (!vendedorSeleccionado) {
      toast.error("Selecciona un vendedor");
      return;
    }

    try {
      await VentaService.actualizarVendedor(
        ventaSeleccionada.id,
        parseInt(vendedorSeleccionado)
      );
      toast.success("Vendedor actualizado exitosamente");
      setEditandoVendedor(false);

      // Notificar al componente padre que la venta fue actualizada
      if (onVentaActualizada) {
        onVentaActualizada(ventaSeleccionada.id);
      }
    } catch (error) {
      console.error("Error al actualizar vendedor:", error);
      toast.error(error.message || "Error al actualizar vendedor");
    }
  };

  // Resetear estado de edición al cerrar modal
  useEffect(() => {
    if (!mostrarModal) {
      setEditandoVendedor(false);
      setVendedorSeleccionado("");
    }
  }, [mostrarModal]);

  if (!mostrarModal || !ventaSeleccionada) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={cerrarModal}>
      <div className="modal-detalle" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            Detalle de Venta #{ventaSeleccionada.folio || ventaSeleccionada.id}
          </h2>
          <button className="btn-cerrar" onClick={cerrarModal}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Información General */}
          <div className="detalle-seccion">
            <h3>Información General</h3>
            <div className="detalle-grid">
              <div className="detalle-item">
                <span className="detalle-label">Fecha:</span>
                <span className="detalle-valor">
                  {formatearFecha(ventaSeleccionada.created_at)}
                </span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Estado:</span>
                <span
                  className={`badge ${
                    getBadgeEstado(ventaSeleccionada.estado_venta).clase
                  }`}
                >
                  {getBadgeEstado(ventaSeleccionada.estado_venta).texto}
                </span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Tienda:</span>
                <span className="detalle-valor">
                  {ventaSeleccionada.tiendas?.nombre || "N/A"}
                </span>
              </div>
              <div className="detalle-item">
                <span className="detalle-label">Usuario ID:</span>
                <span className="detalle-valor">
                  {ventaSeleccionada.usuario_id || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Editar Vendedor (solo admin) */}
          {esAdmin && (
            <div className="detalle-seccion">
              <h3>Vendedor / Comisión</h3>
              {editandoVendedor ? (
                <div className="editar-vendedor-form">
                  <div className="form-group">
                    <label>Asignar comisión a:</label>
                    <select
                      value={vendedorSeleccionado}
                      onChange={(e) => setVendedorSeleccionado(e.target.value)}
                      className="select-vendedor"
                    >
                      <option value="">Seleccionar vendedor...</option>
                      {vendedoresTienda.map((vendedor) => (
                        <option key={vendedor.id} value={vendedor.id}>
                          {vendedor.nombre} {vendedor.apellido} -{" "}
                          {vendedor.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="botones-edicion">
                    <button
                      className="btn-guardar"
                      onClick={guardarCambioVendedor}
                    >
                      Guardar
                    </button>
                    <button
                      className="btn-cancelar-edit"
                      onClick={() => setEditandoVendedor(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="vendedor-actual">
                  <p>
                    <strong>Vendedor actual:</strong> Usuario ID{" "}
                    {ventaSeleccionada.usuario_id || "N/A"}
                  </p>
                  <button
                    className="btn-editar-vendedor"
                    onClick={iniciarEdicionVendedor}
                  >
                    Cambiar Vendedor
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Información del Cliente */}
          {ventaSeleccionada.cliente_info && (
            <div className="detalle-seccion">
              <h3>Cliente</h3>
              <div className="detalle-grid">
                <div className="detalle-item">
                  <span className="detalle-label">Nombre:</span>
                  <span className="detalle-valor">
                    {ventaSeleccionada.cliente_info.nombre}
                  </span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Teléfono:</span>
                  <span className="detalle-valor">
                    {ventaSeleccionada.cliente_info.telefono}
                  </span>
                </div>
                {ventaSeleccionada.cliente_info.email && (
                  <div className="detalle-item">
                    <span className="detalle-label">Email:</span>
                    <span className="detalle-valor">
                      {ventaSeleccionada.cliente_info.email}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Productos */}
          <div className="detalle-seccion">
            <h3>Productos</h3>
            <table className="detalle-tabla">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Variante</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {ventaSeleccionada.ventas_items?.map((item, index) => {
                  // Si no hay producto registrado, mostrar info del producto extra
                  const esProductoExtra = !item.variantes_producto?.sku;
                  const sku = esProductoExtra
                    ? item.producto_sku || "EXTRA"
                    : item.variantes_producto?.sku;
                  const nombreProducto = esProductoExtra
                    ? item.producto_nombre || "Producto no registrado"
                    : item.variantes_producto?.productos?.nombre;
                  const variante = esProductoExtra
                    ? "-"
                    : formatearAtributos(item.variantes_producto?.atributos);

                  return (
                    <tr
                      key={index}
                      className={esProductoExtra ? "producto-extra" : ""}
                    >
                      <td>
                        {sku}
                        {esProductoExtra && (
                          <span className="badge-extra">No registrado</span>
                        )}
                      </td>
                      <td>
                        {esProductoExtra
                          ? item.nombre_producto_extra ||
                            "Producto no registrado"
                          : nombreProducto}
                      </td>
                      <td>{variante}</td>
                      <td>{formatearMoneda(item.precio_unitario)}</td>
                      <td>{item.cantidad}</td>
                      <td>{formatearMoneda(item.subtotal_linea)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="detalle-seccion">
            <div className="detalle-totales">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>{formatearMoneda(ventaSeleccionada.subtotal)}</span>
              </div>
              <div className="total-row">
                <span>Descuento:</span>
                <span>{formatearMoneda(ventaSeleccionada.descuento)}</span>
              </div>
              <div className="total-row">
                <span>Impuestos:</span>
                <span>{formatearMoneda(ventaSeleccionada.impuestos)}</span>
              </div>
              <div className="total-row total-final">
                <span>Total:</span>
                <span>{formatearMoneda(ventaSeleccionada.total)}</span>
              </div>
              <div className="total-row">
                <span>Método de Pago:</span>
                <span>
                  {formatearMetodoPago(ventaSeleccionada.metodo_pago)}
                </span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {ventaSeleccionada.notas && (
            <div className="detalle-seccion">
              <h3>Notas</h3>
              <p className="detalle-notas">{ventaSeleccionada.notas}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {esAdmin && ventaSeleccionada.estado_venta !== "cancelada" && (
            <button
              className="btn-modal btn-cancelar-venta"
              onClick={() => cancelarVenta(ventaSeleccionada.id)}
            >
              <FontAwesomeIcon icon={faBan} /> Cancelar Venta
            </button>
          )}
          <button className="btn-modal btn-cerrar-modal" onClick={cerrarModal}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalleVentaModal;
