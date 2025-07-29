import React, { useEffect, useState } from "react";
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

export default function ProductosScreen() {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [lastProductoId, setLastProductoId] = useState(null);

  // Propiedades del modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  const PRODUCTOS_PAGINA = 100;

  useEffect(() => {
    cargarProductos();
  }, [showModal]);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const nuevos = await obtenerProductosPaginado(
        PRODUCTOS_PAGINA,
        lastProductoId
      );
      if (!Array.isArray(nuevos.productos))
        throw new Error("La respuesta no contiene productos");

      if (nuevos.productos.length > 0) {
        setProductos((prev) => [...prev, ...nuevos.productos]);
        setLastProductoId(nuevos.productos[nuevos.productos.length - 1].id);
      }
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const registrarProducto = (content) => {
    setContentModal(content);
    setModalTitle("Registrar Producto");
    setSize("lg");
    setShowModal(true);
  };

  const handleEdit = (content) => {
    setContentModal(content);
    setModalTitle("Editar Producto");
    setSize("lg");
    setShowModal(true);
  };

  const handleDelete = async (content) => {
    setContentModal(content);
    setModalTitle("Eliminar Producto");
    setSize("md");
    setShowModal(true);
  };

  const columns = [
    { name: "Nombre", selector: (row) => row.nombre, sortable: true },
    { name: "Descripción", selector: (row) => row.descripcion, sortable: true },
    { name: "Categoría", selector: (row) => row.categoria, sortable: true },
    { name: "Precio Base", selector: (row) => row.precioBase, sortable: true },
    {
      name: "Acciones",
      cell: (row) => (
        <div className="d-flex justify-content-between">
          <button
            className=" btn btn-primary btn-sm me-1"
            onClick={() =>
              handleEdit(
                <EditarProducto producto={row} setShow={setShowModal} />
              )
            }
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() =>
              handleDelete(
                <EliminarProducto producto={row} setShow={setShowModal} />
              )
            }
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mt-4">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h2>Productos</h2>
        <button
          className="btn btn-primary"
          onClick={() =>
            registrarProducto(
              <RegistroProducto producto={null} setShow={setShowModal} />
            )
          }
        >
          Registrar Producto
        </button>
      </div>

      {loading ? (
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin />
        </div>
      ) : (
        <>
          <DataTable
            title="Lista de Productos"
            columns={columns}
            data={productos}
            pagination
            highlightOnHover
            responsive
            noDataComponent="No hay productos disponibles"
          />
          {productos.length > 0 && (
            <div className="text-center mt-3">
              <button
                className="btn btn-outline-primary"
                onClick={cargarProductos}
              >
                Cargar más productos
              </button>
            </div>
          )}
        </>
      )}

      <BasicModal
        show={showModal}
        setShow={setShowModal}
        title={modalTitle}
        size={size || "lg"}
      >
        {contentModal}
      </BasicModal>
    </div>
  );
}
