import React, { useEffect, useState } from "react";
import {
  eliminarProducto,
  obtenerProductos,
} from "../../services/productoService";
import BasicModal from "../../components/BasicModal/BasicModal";
import RegistroProducto from "./RegistrarProductos";
import DataTable from "react-data-table-component";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import EditarProducto from "./EditarProducto";

export default function ProductosScreen() {
  const [productos, setProductos] = useState([]);

  // Propiedades del modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  // Función para abrir el modal para registrar un producto
  const registrarProducto = (content) => {
    setContentModal(content);
    setModalTitle("Registrar Tienda");
    setSize("lg");
    setShowModal(true);
  };

  // Función para abrir el modal para editar un producto
  const handleEdit = (content) => {
    setContentModal(content);
    setModalTitle("Editar Tienda");
    setSize("lg");
    setShowModal(true);
  };

  useEffect(() => {
    cargarProductos();
  }, [showModal]);

  const cargarProductos = async () => {
    try {
      let data = await obtenerProductos();
      let lista = Array.isArray(data)
        ? data
        : Array.isArray(data.tiendas)
        ? data.tiendas
        : Array.isArray(data.data)
        ? data.data
        : Object.values(data);
      setProductos(lista);
    } catch (error) {
      console.error("Error al cargar tiendas:", error);
      setProductos([]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta tienda?")) return;
    try {
      await eliminarProducto(id);
      cargarProductos();
    } catch (error) {
      console.error("Error al eliminar tienda:", error);
    }
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
            onClick={() => handleEdit(<EditarProducto producto={row} />)}
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleDelete(row.id)}
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

      <DataTable
        title="Lista de Productos"
        columns={columns}
        data={productos}
        pagination
        highlightOnHover
        responsive
        noDataComponent="No hay productos disponibles"
      />

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
