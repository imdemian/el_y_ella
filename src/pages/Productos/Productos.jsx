import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ProductoService } from "../../services/supabase/productoService";
import BasicModal from "../../components/BasicModal/BasicModal";
import RegistroProducto from "./RegistrarProductos";
import DataTable from "react-data-table-component";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faSpinner,
  faTrashCan,
  faPlus,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import EliminarProducto from "./Eliminar.Producto";
import { toast } from "react-toastify";
import "./Productos.scss";

export default function ProductosScreen() {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [contentModal, setContentModal] = useState(null);
  const [size, setSize] = useState("lg");

  // Visor de imágenes
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [imagenesProducto, setImagenesProducto] = useState([]);

  // Cargar productos
  const cargarProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ProductoService.listarProductos({
        page: 1,
        limit: 100,
        activo: "all",
      });

      // La respuesta tiene estructura { data: [...], pagination: {...} }
      const productosData = response.data || [];
      setProductos(productosData);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError(error.message);
      toast.error(error.message || "Error al cargar productos");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    cargarProductos();
  }, []);

  // Abrir modal registrar
  const registrarProducto = () => {
    setContentModal(
      <RegistroProducto
        producto={null}
        setShow={setShowModal}
        refetch={cargarProductos}
      />
    );
    setModalTitle("Registrar Producto");
    setSize("lg");
    setShowModal(true);
  };

  // Editar
  const handleEdit = useCallback((row) => {
    setContentModal(
      <RegistroProducto
        producto={row}
        setShow={setShowModal}
        refetch={cargarProductos}
      />
    );
    setModalTitle("Editar Producto");
    setSize("lg");
    setShowModal(true);
  }, []);

  // Eliminar
  const handleDelete = useCallback((row) => {
    setContentModal(
      <EliminarProducto
        producto={row}
        setShow={setShowModal}
        refetch={cargarProductos}
      />
    );
    setModalTitle("Desactivar Producto");
    setSize("md");
    setShowModal(true);
  }, []);

  // Ver imágenes del producto
  const handleVerImagenes = useCallback((row) => {
    const imagenes = [];

    // Agregar imagen principal del producto
    if (row.imagen_url) {
      imagenes.push({
        url: row.imagen_url,
        thumbnail: row.imagen_thumbnail_url,
        tipo: "Principal",
        descripcion: row.nombre,
      });
    }

    // Agregar imágenes de variantes si existen
    if (row.variantes_producto && row.variantes_producto.length > 0) {
      row.variantes_producto.forEach((variante) => {
        if (variante.imagen_url) {
          imagenes.push({
            url: variante.imagen_url,
            thumbnail: variante.imagen_thumbnail_url,
            tipo: "Variante",
            descripcion: `${variante.talla || ""} - ${
              variante.color || ""
            } (SKU: ${variante.sku})`.trim(),
          });
        }
      });
    }

    if (imagenes.length === 0) {
      toast.info("Este producto no tiene imágenes disponibles");
      return;
    }

    setImagenesProducto(imagenes);
    setImagenSeleccionada(0);
    setShowImageViewer(true);
  }, []);

  // Filtrar productos
  const productosFiltrados = useMemo(() => {
    if (!filterText) return productos;
    return productos.filter(
      (producto) =>
        producto.nombre?.toLowerCase().includes(filterText.toLowerCase()) ||
        producto.descripcion
          ?.toLowerCase()
          .includes(filterText.toLowerCase()) ||
        producto.categorias?.nombre
          ?.toLowerCase()
          .includes(filterText.toLowerCase())
    );
  }, [productos, filterText]);

  const columns = useMemo(
    () => [
      {
        name: "Imagen",
        cell: (row) => (
          <div
            className="producto-imagen clickable"
            onClick={() => handleVerImagenes(row)}
            title="Ver imágenes"
          >
            {row.imagen_thumbnail_url || row.imagen_url ? (
              <img
                src={row.imagen_thumbnail_url || row.imagen_url}
                alt={row.nombre}
                className="producto-thumb"
              />
            ) : (
              <div className="producto-sin-imagen">
                <span>📦</span>
              </div>
            )}
          </div>
        ),
        width: "100px",
        center: true,
        style: {
          padding: "12px",
        },
      },
      {
        name: "Nombre",
        selector: (row) => row.nombre || "Sin nombre",
        sortable: true,
        grow: 2,
      },
      {
        name: "Descripción",
        selector: (row) => row.descripcion || "Sin descripción",
        sortable: true,
        grow: 2,
      },
      {
        name: "Categoría",
        selector: (row) => row.categorias?.nombre || "Sin categoría",
        sortable: true,
        grow: 1,
      },
      {
        name: "Precio Base",
        selector: (row) => `$${parseFloat(row.precio_base || 0).toFixed(2)}`,
        sortable: true,
        right: true,
        grow: 1,
      },
      {
        name: "Estado",
        cell: (row) => (
          <span
            className={`badge-estado ${row.activo ? "activo" : "inactivo"}`}
          >
            {row.activo ? "Activo" : "Inactivo"}
          </span>
        ),
        center: true,
        grow: 1,
      },
      {
        name: "Acciones",
        cell: (row) => (
          <div className="d-flex">
            <button
              className="btn-action btn-edit"
              onClick={() => handleEdit(row)}
              title="Editar"
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              className="btn-action btn-delete"
              onClick={() => handleDelete(row)}
              title="Desactivar"
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
          </div>
        ),
        ignoreRowClick: true,
        center: true,
        grow: 1,
      },
    ],
    [handleDelete, handleEdit, handleVerImagenes]
  );

  const customStyles = {
    headRow: {
      style: {
        background: "linear-gradient(135deg, #9b7fa8 0%, #8f749f 100%)",
        color: "white",
        fontWeight: "600",
        fontSize: "1rem",
        minHeight: "56px",
      },
    },
    headCells: {
      style: {
        color: "white",
        fontSize: "1rem",
        fontWeight: "600",
      },
    },
    rows: {
      style: {
        minHeight: "80px",
        fontSize: "0.95rem",
        "&:hover": {
          backgroundColor: "#f9fafb",
          cursor: "pointer",
        },
      },
    },
    cells: {
      style: {
        paddingLeft: "16px",
        paddingRight: "16px",
      },
    },
  };

  return (
    <div className="productos-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Productos</h1>
          <button className="btn-registrar" onClick={registrarProducto}>
            <FontAwesomeIcon icon={faPlus} />
            Registrar Producto
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">
            <FontAwesomeIcon icon={faSearch} />
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar productos por nombre, descripción o categoría..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && productos.length === 0 ? (
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Cargando productos...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={productosFiltrados}
          pagination
          paginationPerPage={10}
          paginationRowsPerPageOptions={[10, 20, 50, 100]}
          highlightOnHover
          responsive
          noDataComponent="No hay productos disponibles"
          customStyles={customStyles}
        />
      )}

      <BasicModal
        show={showModal}
        setShow={setShowModal}
        title={modalTitle}
        size={size || "lg"}
      >
        {contentModal}
      </BasicModal>

      {/* Visor de imágenes */}
      {showImageViewer && (
        <div
          className="image-viewer-overlay"
          onClick={() => setShowImageViewer(false)}
        >
          <div
            className="image-viewer-container"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-viewer"
              onClick={() => setShowImageViewer(false)}
              title="Cerrar"
            >
              ✕
            </button>

            <div className="image-viewer-main">
              {imagenesProducto.length > 0 && (
                <>
                  <div className="imagen-principal-viewer">
                    <img
                      src={imagenesProducto[imagenSeleccionada].url}
                      alt={imagenesProducto[imagenSeleccionada].descripcion}
                    />
                  </div>

                  <div className="imagen-info">
                    <span className="imagen-tipo">
                      {imagenesProducto[imagenSeleccionada].tipo}
                    </span>
                    <span className="imagen-descripcion">
                      {imagenesProducto[imagenSeleccionada].descripcion}
                    </span>
                    <span className="imagen-contador">
                      {imagenSeleccionada + 1} / {imagenesProducto.length}
                    </span>
                  </div>

                  {imagenesProducto.length > 1 && (
                    <>
                      <button
                        className="nav-button prev"
                        onClick={() =>
                          setImagenSeleccionada(
                            imagenSeleccionada === 0
                              ? imagenesProducto.length - 1
                              : imagenSeleccionada - 1
                          )
                        }
                        title="Anterior"
                      >
                        ‹
                      </button>
                      <button
                        className="nav-button next"
                        onClick={() =>
                          setImagenSeleccionada(
                            imagenSeleccionada === imagenesProducto.length - 1
                              ? 0
                              : imagenSeleccionada + 1
                          )
                        }
                        title="Siguiente"
                      >
                        ›
                      </button>
                    </>
                  )}

                  <div className="thumbnails-container">
                    {imagenesProducto.map((img, index) => (
                      <div
                        key={index}
                        className={`thumbnail-item ${
                          index === imagenSeleccionada ? "active" : ""
                        }`}
                        onClick={() => setImagenSeleccionada(index)}
                      >
                        <img
                          src={img.thumbnail || img.url}
                          alt={img.descripcion}
                        />
                        <span className="thumb-label">{img.tipo}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
