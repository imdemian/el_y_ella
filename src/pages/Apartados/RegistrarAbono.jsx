// src/pages/Apartados/RegistrarAbono.jsx
import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faMoneyBillWave,
  faTag,
  faUser,
  faCreditCard,
  faMoneyBill,
  faExchangeAlt,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import { ApartadoService } from "../../services/supabase/apartadoService";
import { AuthContext } from "../../utils/context";
import "./RegistrarAbono.scss";

const RegistrarAbono = ({ apartado, tiendaId, onClose, onAbonoRegistrado }) => {
  const { userRole, user } = useContext(AuthContext);
  const esAdmin = userRole === "admin";

  console.log(userRole);

  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [notas, setNotas] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
  const [vendedores, setVendedores] = useState([]);

  // Calcular pendiente
  const pendiente = (apartado.total || 0) - (apartado.total_abonado || 0);
  const clienteInfo = apartado.cliente_info || {};

  // Cargar vendedores si es admin
  useEffect(() => {
    const cargarVendedores = async () => {
      if (esAdmin) {
        try {
          const { UsuariosService } = await import(
            "../../services/supabase/usuariosService"
          );
          const listaUsuarios = await UsuariosService.obtenerUsuarios();
          setVendedores(listaUsuarios);
          // Pre-seleccionar el usuario actual
          if (user?.id) {
            setVendedorSeleccionado(user.id.toString());
          }
        } catch (error) {
          console.error("Error al cargar vendedores:", error);
        }
      } else {
        // Si no es admin, usar el usuario actual
        if (user?.id) {
          setVendedorSeleccionado(user.id.toString());
        }
      }
    };
    cargarVendedores();
  }, [esAdmin, tiendaId, user]);

  // Formatear moneda
  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cantidad || 0);
  };

  // Manejar cambio de monto
  const handleMontoChange = (e) => {
    const valor = e.target.value;
    // Solo números y decimales
    if (valor === "" || /^\d*\.?\d{0,2}$/.test(valor)) {
      setMonto(valor);
    }
  };

  // Aplicar monto rápido
  const aplicarMontoRapido = (porcentaje) => {
    const montoCalculado = (pendiente * porcentaje) / 100;
    setMonto(montoCalculado.toFixed(2));
  };

  // Liquidar todo
  const liquidarTodo = () => {
    setMonto(pendiente.toFixed(2));
  };

  // Registrar abono
  const registrarAbono = async () => {
    // Validaciones
    if (!monto || parseFloat(monto) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    const montoNumerico = parseFloat(monto);
    if (montoNumerico > pendiente) {
      toast.error("El monto no puede ser mayor al pendiente");
      return;
    }

    if (!vendedorSeleccionado) {
      toast.error("Selecciona un vendedor");
      return;
    }

    setProcesando(true);

    try {
      const abonoData = {
        monto: montoNumerico,
        metodo_pago: { [metodoPago]: montoNumerico },
        notas: notas || null,
        tienda_id: tiendaId,
        usuario_id: parseInt(vendedorSeleccionado),
      };

      const resultado = await ApartadoService.registrarAbono(
        apartado.id,
        abonoData
      );

      toast.success(`Abono ${resultado.folio_abono} registrado exitosamente`);

      // Si el monto pagado completa el total, mostrar mensaje especial
      if (montoNumerico >= pendiente) {
        toast.info("¡El apartado ha sido pagado completamente!");
      }

      onAbonoRegistrado();
    } catch (error) {
      console.error("Error al registrar abono:", error);
      toast.error(error.message || "Error al registrar el abono");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content registrar-abono-modal">
        {/* Header */}
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faMoneyBillWave} /> Registrar Abono
          </h2>
          <button className="btn-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Info del apartado */}
          <div className="apartado-info">
            <div className="info-row">
              <span className="label">
                <FontAwesomeIcon icon={faTag} /> Folio:
              </span>
              <span className="value">{apartado.folio}</span>
            </div>
            <div className="info-row">
              <span className="label">
                <FontAwesomeIcon icon={faUser} /> Cliente:
              </span>
              <span className="value">
                {clienteInfo.nombre || "Sin nombre"}
              </span>
            </div>
          </div>

          {/* Resumen de montos */}
          <div className="montos-resumen">
            <div className="monto-item total">
              <span>Total del apartado:</span>
              <strong>{formatearMoneda(apartado.total)}</strong>
            </div>
            <div className="monto-item abonado">
              <span>Ya abonado:</span>
              <strong>{formatearMoneda(apartado.total_abonado)}</strong>
            </div>
            <div className="monto-item pendiente">
              <span>Pendiente:</span>
              <strong>{formatearMoneda(pendiente)}</strong>
            </div>
          </div>

          {/* Formulario de abono */}
          <div className="abono-form">
            {/* Monto */}
            <div className="form-group">
              <label>Monto del abono</label>
              <div className="monto-input-container">
                <span className="currency-symbol">$</span>
                <input
                  type="text"
                  value={monto}
                  onChange={handleMontoChange}
                  placeholder="0.00"
                  className="monto-input"
                  autoFocus
                />
              </div>
            </div>

            {/* Botones de monto rápido */}
            <div className="montos-rapidos">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => aplicarMontoRapido(25)}
              >
                25%
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => aplicarMontoRapido(50)}
              >
                50%
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => aplicarMontoRapido(75)}
              >
                75%
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={liquidarTodo}
              >
                Liquidar Todo
              </button>
            </div>

            {/* Método de pago */}
            <div className="form-group">
              <label>Método de pago</label>
              <div className="metodo-pago-options">
                <button
                  type="button"
                  className={`metodo-btn ${
                    metodoPago === "efectivo" ? "active" : ""
                  }`}
                  onClick={() => setMetodoPago("efectivo")}
                >
                  <FontAwesomeIcon icon={faMoneyBill} />
                  <span>Efectivo</span>
                </button>
                <button
                  type="button"
                  className={`metodo-btn ${
                    metodoPago === "tarjeta" ? "active" : ""
                  }`}
                  onClick={() => setMetodoPago("tarjeta")}
                >
                  <FontAwesomeIcon icon={faCreditCard} />
                  <span>Tarjeta</span>
                </button>
                <button
                  type="button"
                  className={`metodo-btn ${
                    metodoPago === "transferencia" ? "active" : ""
                  }`}
                  onClick={() => setMetodoPago("transferencia")}
                >
                  <FontAwesomeIcon icon={faExchangeAlt} />
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* Vendedor (solo admin) */}
            {esAdmin && vendedores.length > 0 && (
              <div className="form-group">
                <label>
                  <FontAwesomeIcon icon={faUser} /> Asignar a vendedor
                </label>
                <select
                  value={vendedorSeleccionado}
                  onChange={(e) => setVendedorSeleccionado(e.target.value)}
                  className="select-vendedor"
                >
                  <option value="">Seleccionar vendedor...</option>
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombre} {vendedor.apellido} - {vendedor.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notas */}
            <div className="form-group">
              <label>Notas (opcional)</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas adicionales sobre este abono..."
                rows={2}
              />
            </div>
          </div>

          {/* Preview del resultado */}
          {monto && parseFloat(monto) > 0 && (
            <div className="preview-resultado">
              <h4>Después de este abono:</h4>
              <div className="preview-row">
                <span>Nuevo total abonado:</span>
                <strong>
                  {formatearMoneda(
                    (apartado.total_abonado || 0) + parseFloat(monto)
                  )}
                </strong>
              </div>
              <div className="preview-row">
                <span>Nuevo pendiente:</span>
                <strong
                  className={pendiente - parseFloat(monto) <= 0 ? "pagado" : ""}
                >
                  {formatearMoneda(pendiente - parseFloat(monto))}
                </strong>
              </div>
              {pendiente - parseFloat(monto) <= 0 && (
                <div className="pagado-completo">
                  ✓ El apartado quedará completamente pagado
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={registrarAbono}
            disabled={procesando || !monto || parseFloat(monto) <= 0}
          >
            {procesando ? (
              <>Procesando...</>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} /> Registrar Abono
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrarAbono;
