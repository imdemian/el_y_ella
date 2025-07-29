import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerTiendas } from "../../services/tiendaService";
import RegistroTiendas from "./RegistroTiendas";
import DataTable from "react-data-table-component";
import BasicModal from "../../components/BasicModal/BasicModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenSquare,
  faTrashCan,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";
import EliminacionTienda from "./Eliminacion.Tienda";

export default function TiendasScreen() {
  const [tiendas, setTiendas] = useState([]);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  const navigate = useNavigate();

  // Registrar tienda
  const registrarTiendas = () => {
    setContentModal(<RegistroTiendas tienda={null} setShow={setShowModal} />);
    setModalTitle("Registrar Tienda");
    setSize("md");
    setShowModal(true);
  };

  // Editar tienda
  const handleEdit = useCallback((tienda) => {
    setContentModal(<RegistroTiendas tienda={tienda} setShow={setShowModal} />);
    setModalTitle("Editar Tienda");
    setSize("md");
    setShowModal(true);
  }, []);

  // Eliminar tienda
  const handleDelete = useCallback((tienda) => {
    setContentModal(
      <EliminacionTienda tienda={tienda} setShow={setShowModal} />
    );
    setModalTitle("Eliminar Tienda");
    setSize("md");
    setShowModal(true);
  }, []);

  // Ver inventario
  const handleInventory = useCallback(
    (tienda) => {
      navigate(`/tiendas/${tienda.id}/inventario`);
    },
    [navigate]
  );

  useEffect(() => {
    cargarTiendas();
  }, [showModal]);

  const cargarTiendas = async () => {
    try {
      const data = await obtenerTiendas();
      const lista = Array.isArray(data)
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
              className="btn btn-sm btn-outline-danger me-2"
              onClick={() => handleDelete(row)}
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleInventory(row)}
            >
              <FontAwesomeIcon icon={faWarehouse} /> Inventario
            </button>
          </>
        ),
        ignoreRowClick: true,
      },
    ],
    [handleEdit, handleDelete, handleInventory]
  );

  return (
    <div className="container mt-4">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h2>Tiendas</h2>
        <button className="btn btn-primary" onClick={registrarTiendas}>
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
