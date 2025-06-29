import React, { useState, useEffect, useMemo, useCallback } from "react";
import { obtenerTiendas } from "../../services/tiendaService";
import RegistroTiendas from "./RegistroTiendas";
import DataTable from "react-data-table-component";
import BasicModal from "../../components/BasicModal/BasicModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import EliminacionTienda from "./Eliminacion.Tienda";

export default function TiendasScreen() {
  const [tiendas, setTiendas] = useState([]);

  // Propiedades del modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  // Función para abrir el modal para registrar una tienda
  const registrarTiendas = (content) => {
    setContentModal(content);
    setModalTitle("Registrar Tienda");
    setSize("md");
    setShowModal(true);
  };

  // Función para abrir el modal para editar una tienda
  const handleEdit = (tienda) => {
    setContentModal(<RegistroTiendas tienda={tienda} setShow={setShowModal} />);
    setModalTitle("Editar Tienda");
    setSize("md");
    setShowModal(true);
  };

  // Función para eliminar una tienda
  const handleDelete = useCallback(
    (tienda) => {
      setContentModal(
        <EliminacionTienda tienda={tienda} setShow={setShowModal} />
      );
      setModalTitle("Eliminar Tienda");
      setSize("md");
      setShowModal(true);
    },
    [setContentModal, setModalTitle, setSize, setShowModal]
  );

  useEffect(() => {
    cargarTiendas();
  }, [showModal]);

  const cargarTiendas = async () => {
    try {
      let data = await obtenerTiendas();
      let lista = Array.isArray(data)
        ? data
        : Array.isArray(data.tiendas)
        ? data.tiendas
        : Array.isArray(data.data)
        ? data.data
        : Object.values(data);
      setTiendas(lista);
    } catch (error) {
      console.error("Error al cargar tiendas:", error);
      setTiendas([]);
    }
  };

  const columns = useMemo(
    () => [
      { name: "Nombre", selector: (row) => row.nombre, sortable: true },
      { name: "Dirección", selector: (row) => row.direccion, sortable: true },
      {
        name: "Teléfono",
        selector: (row) => row.telefono || "-",
        sortable: true,
      },
      {
        name: "Encargado",
        selector: (row) => row.encargado || "-",
        sortable: true,
      },
      {
        name: "Acciones",
        cell: (row) => (
          <>
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={() => handleEdit(row)}
            >
              <FontAwesomeIcon icon={faPenSquare} />
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDelete(row)}
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
          </>
        ),
        ignoreRowClick: true,
      },
    ],
    [handleDelete]
  );

  return (
    <div className="container mt-4">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h2>Tiendas</h2>
        <button
          className="btn btn-primary"
          onClick={() =>
            registrarTiendas(
              <RegistroTiendas tienda={null} setShow={setShowModal} />
            )
          }
        >
          Registrar Tienda
        </button>
      </div>

      <DataTable
        columns={columns}
        data={tiendas}
        pagination
        highlightOnHover
        responsive
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
