import React, { useCallback, useEffect, useMemo, useState } from "react";
import { obtenerProductosPaginado } from "../../services/productoService";
import BasicModal from "../../components/BasicModal/BasicModal";
import RegistroProducto from "./RegistrarProductos";
import DataTable from "react-data-table-component";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faSpinner,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import EditarProducto from "./EditarProducto";
import EliminarProducto from "./Eliminar.Producto";

const PAGE_SIZE = 100;

export default function ProductosScreen() {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [cursor, setCursor] = useState(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  // Dedupe por id
  const mergeUniqueById = useCallback((prev, next) => {
    const map = new Map(prev.map((p) => [p.id, p]));
    next.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, []);

  // Normaliza respuesta del backend
  const parseRespuesta = (resp) => {
    const productos = Array.isArray(resp)
      ? resp
      : Array.isArray(resp.productos)
      ? resp.productos
      : Array.isArray(resp.data)
      ? resp.data
      : [];
    const nextStartAfter =
      (resp && (resp.nextStartAfter || resp.cursor)) ||
      (productos.length ? productos[productos.length - 1].id : null);
    return { productos, nextStartAfter };
  };

  // Cargar primera página (reset)
  const cargarPrimeraPagina = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const resp = await obtenerProductosPaginado(PAGE_SIZE, null);
      const { productos: lista, nextStartAfter } = parseRespuesta(resp);
      setProductos(lista);
      setCursor(nextStartAfter || null);
    } catch (error) {
      console.error("Error al cargar productos (primera página):", error);
      setProductos([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, [loading]); // sin deps

  // Cargar más
  const cargarMas = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const resp = await obtenerProductosPaginado(PAGE_SIZE, cursor);
      const { productos: lista, nextStartAfter } = parseRespuesta(resp);
      setProductos((prev) => mergeUniqueById(prev, lista));
      setCursor(nextStartAfter || null);
    } catch (error) {
      console.error("Error al cargar más productos:", error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, mergeUniqueById]);

  // Carga inicial
  useEffect(() => {
    cargarPrimeraPagina();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cerrar modal por cualquier vía (X, backdrop o desde hijos) refrescamos
  const handleModalVisibility = useCallback(
    (visible) => {
      setShowModal(visible);
      if (!visible) {
        // Solo cuando se cierra
        cargarPrimeraPagina();
      }
    },
    [cargarPrimeraPagina]
  );

  // Si los hijos guardan/eliminan, solo cerramos; el refresh ocurrirá en handleModalVisibility(false)
  const closeModal = useCallback(
    () => handleModalVisibility(false),
    [handleModalVisibility]
  );

  // Abrir modal registrar
  const registrarProducto = () => {
    setContentModal(
      <RegistroProducto
        producto={null}
        setShow={handleModalVisibility}
        onSaved={closeModal} // cierra; el refresh lo hace handleModalVisibility(false)
      />
    );
    setModalTitle("Registrar Producto");
    setSize("lg");
    setShowModal(true);
  };

  // Editar
  const handleEdit = useCallback(
    (row) => {
      setContentModal(
        <RegistroProducto
          producto={row}
          setShow={handleModalVisibility}
          onSaved={closeModal}
        />
      );
      setModalTitle("Editar Producto");
      setSize("lg");
      setShowModal(true);
    },
    [handleModalVisibility, closeModal]
  );

  // Eliminar
  const handleDelete = useCallback(
    (row) => {
      setContentModal(
        <EliminarProducto
          producto={row}
          setShow={handleModalVisibility}
          onDeleted={closeModal}
        />
      );
      setModalTitle("Eliminar Producto");
      setSize("md");
      setShowModal(true);
    },
    [handleModalVisibility, closeModal]
  );

  const columns = useMemo(
    () => [
      { name: "Nombre", selector: (row) => row.nombre, sortable: true },
      {
        name: "Descripción",
        selector: (row) => row.descripcion,
        sortable: true,
      },
      { name: "Categoría", selector: (row) => row.categoria, sortable: true },
      {
        name: "Precio Base",
        selector: (row) => row.precioBase,
        sortable: true,
      },
      {
        name: "Acciones",
        cell: (row) => (
          <div className="d-flex justify-content-between">
            <button
              className="btn btn-primary btn-sm me-1"
              onClick={() => handleEdit(row)}
              title="Editar"
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDelete(row)}
              title="Eliminar"
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
          </div>
        ),
        ignoreRowClick: true,
      },
    ],
    [handleDelete, handleEdit]
  );

  return (
    <div className="container mt-4">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h2>Productos</h2>
        <button className="btn btn-primary" onClick={registrarProducto}>
          Registrar Producto
        </button>
      </div>

      {loading && productos.length === 0 ? (
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={productos}
            pagination
            highlightOnHover
            responsive
            noDataComponent="No hay productos disponibles"
          />

          <div className="text-center mt-3">
            <button
              className="btn btn-outline-primary"
              onClick={cargarMas}
              disabled={loading || !cursor}
            >
              {loading
                ? "Cargando..."
                : cursor
                ? "Cargar más productos"
                : "No hay más resultados"}
            </button>
          </div>
        </>
      )}

      <BasicModal
        show={showModal}
        setShow={
          handleModalVisibility
        } /* ← clave: wrap para refrescar al cerrar */
        title={modalTitle}
        size={size || "lg"}
      >
        {contentModal}
      </BasicModal>
    </div>
  );
}
