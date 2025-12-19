// src/pages/Apartados/Apartados.jsx
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLayerGroup,
  faPlus,
  faSearch,
  faSync,
  faEye,
  faMoneyBillWave,
  faCheck,
  faCalendarAlt,
  faUser,
  faPhone,
  faTag,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";
import { ApartadoService } from "../../services/supabase/apartadoService";
import { AuthContext } from "../../utils/context";
import CrearApartado from "./CrearApartado";
import DetalleApartado from "./DetalleApartado";
import RegistrarAbono from "./RegistrarAbono";
import "./Apartados.scss";

const Apartados = () => {
  // Estados principales
  const [apartados, setApartados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Estados para filtros
  const [estadoFiltro, setEstadoFiltro] = useState("activo");
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState("");
  const [tiendas, setTiendas] = useState([]);
  const [esAdmin, setEsAdmin] = useState(false);

  // Estados para modales
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [mostrarEditar, setMostrarEditar] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarAbono, setMostrarAbono] = useState(false);
  const [apartadoSeleccionado, setApartadoSeleccionado] = useState(null);

  // Cargar tiendas y configuración inicial
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("app_user") || "{}");
        const tiendaUsuario = userData.tienda_id;
        const rolUsuario = userData.rol;

        setEsAdmin(rolUsuario === "admin");

        const { TiendaService } = await import(
          "../../services/supabase/tiendaService"
        );
        const listaTiendas = await TiendaService.obtenerTiendas();
        setTiendas(listaTiendas);

        if (tiendaUsuario) {
          const tiendaEncontrada = listaTiendas.find(
            (t) => t.id === tiendaUsuario || t.id === String(tiendaUsuario)
          );
          if (tiendaEncontrada) {
            setTiendaSeleccionada(tiendaEncontrada.id);
          } else if (listaTiendas.length > 0) {
            setTiendaSeleccionada(listaTiendas[0].id);
          }
        } else if (rolUsuario === "admin" && listaTiendas.length > 0) {
          setTiendaSeleccionada(listaTiendas[0].id);
        }
      } catch (error) {
        console.error("Error al cargar configuración:", error);
        toast.error("Error al cargar la configuración");
      }
    };

    cargarConfiguracion();
  }, []);

  // Cargar apartados
  const cargarApartados = useCallback(async () => {
    if (!tiendaSeleccionada) return;

    setCargando(true);
    try {
      const filtros = {
        tienda_id: tiendaSeleccionada,
        estado: estadoFiltro !== "todos" ? estadoFiltro : undefined,
        busqueda: busqueda || undefined,
      };

      const data = await ApartadoService.obtenerApartados(filtros);
      setApartados(data);
    } catch (error) {
      console.error("Error al cargar apartados:", error);
      toast.error("Error al cargar los apartados");
    } finally {
      setCargando(false);
    }
  }, [tiendaSeleccionada, estadoFiltro, busqueda]);

  // Efecto para cargar apartados cuando cambian los filtros
  useEffect(() => {
    cargarApartados();
  }, [cargarApartados]);

  // Manejar búsqueda
  const handleBuscar = (e) => {
    e.preventDefault();
    cargarApartados();
  };

  // Abrir modal de detalle
  const verDetalle = (apartado) => {
    setApartadoSeleccionado(apartado);
    setMostrarDetalle(true);
  };

  // Abrir modal de editar
  const editarApartado = (apartado) => {
    setApartadoSeleccionado(apartado);
    setMostrarEditar(true);
  };

  // Abrir modal de abono
  const registrarAbono = (apartado) => {
    setApartadoSeleccionado(apartado);
    setMostrarAbono(true);
  };

  // Cambiar estado de apartado
  const cambiarEstado = async (apartado, nuevoEstado) => {
    try {
      await ApartadoService.cambiarEstado(apartado.id, nuevoEstado);
      toast.success(`Apartado marcado como ${nuevoEstado}`);
      cargarApartados();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      toast.error("Error al cambiar el estado");
    }
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

  return (
    <div className="apartados-container">
      {/* Header */}
      <div className="apartados-header">
        <div className="header-title">
          <FontAwesomeIcon icon={faLayerGroup} className="title-icon" />
          <h1>Apartados</h1>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setMostrarCrear(true)}
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Nuevo Apartado</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="apartados-filtros">
        {/* Selector de tienda (solo admin) */}
        {esAdmin && tiendas.length > 0 && (
          <div className="filtro-grupo">
            <label>Tienda:</label>
            <select
              value={tiendaSeleccionada}
              onChange={(e) => setTiendaSeleccionada(e.target.value)}
              className="filtro-select"
            >
              {tiendas.map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro de estado */}
        <div className="filtro-grupo">
          <label>Estado:</label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="filtro-select"
          >
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="pagado">Pagados</option>
            <option value="listo">Listos</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>

        {/* Búsqueda */}
        <form className="filtro-busqueda" onSubmit={handleBuscar}>
          <input
            type="text"
            placeholder="Buscar por folio o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button type="submit" className="btn btn-icon">
            <FontAwesomeIcon icon={faSearch} />
          </button>
        </form>

        {/* Botón refrescar */}
        <button
          className="btn btn-icon btn-secondary"
          onClick={cargarApartados}
          disabled={cargando}
        >
          <FontAwesomeIcon icon={faSync} spin={cargando} />
        </button>
      </div>

      {/* Tabla de apartados */}
      <div className="apartados-table-container">
        {cargando ? (
          <div className="loading-container">
            <FontAwesomeIcon icon={faSync} spin size="2x" />
            <p>Cargando apartados...</p>
          </div>
        ) : apartados.length === 0 ? (
          <div className="empty-container">
            <FontAwesomeIcon icon={faLayerGroup} size="3x" />
            <p>No hay apartados para mostrar</p>
            <button
              className="btn btn-primary"
              onClick={() => setMostrarCrear(true)}
            >
              Crear primer apartado
            </button>
          </div>
        ) : (
          <table className="apartados-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Abonado</th>
                <th>Pendiente</th>
                <th>Entrega Est.</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {apartados.map((apartado) => {
                const pendiente =
                  (apartado.total || 0) - (apartado.total_abonado || 0);
                const clienteInfo = apartado.cliente_info || {};

                return (
                  <tr key={apartado.id}>
                    <td className="folio-cell">
                      <FontAwesomeIcon icon={faTag} className="folio-icon" />
                      <span>{apartado.folio}</span>
                    </td>
                    <td className="cliente-cell">
                      <div className="cliente-info">
                        <span className="cliente-nombre">
                          <FontAwesomeIcon icon={faUser} />
                          {clienteInfo.nombre || "Sin nombre"}
                        </span>
                        {clienteInfo.telefono && (
                          <span className="cliente-telefono">
                            <FontAwesomeIcon icon={faPhone} />
                            {clienteInfo.telefono}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="monto-cell">
                      {formatearMoneda(apartado.total)}
                    </td>
                    <td className="monto-cell abonado">
                      {formatearMoneda(apartado.total_abonado)}
                    </td>
                    <td className="monto-cell pendiente">
                      {formatearMoneda(pendiente)}
                    </td>
                    <td className="fecha-cell">
                      <FontAwesomeIcon icon={faCalendarAlt} />
                      {formatearFecha(apartado.fecha_entrega_estimada)}
                    </td>
                    <td>
                      <span
                        className={`badge ${getEstadoBadgeClass(
                          apartado.estado
                        )}`}
                      >
                        {apartado.estado}
                      </span>
                    </td>
                    <td className="acciones-cell">
                      <button
                        className="btn btn-sm btn-icon"
                        onClick={() => verDetalle(apartado)}
                        title="Ver detalle"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      {(apartado.estado === "activo" ||
                        apartado.estado === "pagado") && (
                        <button
                          className="btn btn-sm btn-icon btn-warning"
                          onClick={() => editarApartado(apartado)}
                          title="Editar apartado"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      )}
                      {apartado.estado === "activo" && (
                        <button
                          className="btn btn-sm btn-icon btn-success"
                          onClick={() => registrarAbono(apartado)}
                          title="Registrar abono"
                        >
                          <FontAwesomeIcon icon={faMoneyBillWave} />
                        </button>
                      )}
                      {apartado.estado === "pagado" && (
                        <button
                          className="btn btn-sm btn-icon btn-info"
                          onClick={() => cambiarEstado(apartado, "listo")}
                          title="Marcar como listo"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                      )}
                      {apartado.estado === "listo" && (
                        <button
                          className="btn btn-sm btn-icon btn-secondary"
                          onClick={() => cambiarEstado(apartado, "entregado")}
                          title="Marcar como entregado"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear Apartado */}
      {mostrarCrear && (
        <CrearApartado
          tiendaId={tiendaSeleccionada}
          onClose={() => setMostrarCrear(false)}
          onCreado={() => {
            setMostrarCrear(false);
            cargarApartados();
          }}
        />
      )}

      {/* Modal Editar Apartado */}
      {mostrarEditar && apartadoSeleccionado && (
        <CrearApartado
          tiendaId={tiendaSeleccionada}
          apartadoId={apartadoSeleccionado.id}
          onClose={() => {
            setMostrarEditar(false);
            setApartadoSeleccionado(null);
          }}
          onCreado={() => {
            setMostrarEditar(false);
            setApartadoSeleccionado(null);
            cargarApartados();
          }}
        />
      )}

      {/* Modal Detalle Apartado */}
      {mostrarDetalle && apartadoSeleccionado && (
        <DetalleApartado
          apartadoId={apartadoSeleccionado.id}
          onClose={() => {
            setMostrarDetalle(false);
            setApartadoSeleccionado(null);
          }}
          onActualizado={cargarApartados}
        />
      )}

      {/* Modal Registrar Abono */}
      {mostrarAbono && apartadoSeleccionado && (
        <RegistrarAbono
          apartado={apartadoSeleccionado}
          tiendaId={tiendaSeleccionada}
          onClose={() => {
            setMostrarAbono(false);
            setApartadoSeleccionado(null);
          }}
          onAbonoRegistrado={() => {
            setMostrarAbono(false);
            setApartadoSeleccionado(null);
            cargarApartados();
          }}
        />
      )}
    </div>
  );
};

export default Apartados;
