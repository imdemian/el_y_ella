import React, { useState, useEffect } from "react";
import Barcode from "react-barcode";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faBarcode,
  faFilePdf,
  faTrash,
  faPlus,
  faMinus,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { VarianteService } from "../../services/supabase/varianteService";
import { CategoriaService } from "../../services/supabase/categoriaService";
import BasicModal from "../../components/BasicModal/BasicModal";
import "./CodigosBarra.scss";

const CodigosBarra = () => {
  const [variantes, setVariantes] = useState([]);
  const [variantesFiltradas, setVariantesFiltradas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariantes, setSelectedVariantes] = useState(new Map());
  const [etiquetasParaImprimir, setEtiquetasParaImprimir] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [variantesData, categoriasData] = await Promise.all([
          VarianteService.obtenerVariantes(),
          CategoriaService.obtenerCategorias(),
        ]);
        setVariantes(variantesData);
        setVariantesFiltradas(variantesData);
        setCategorias(categoriasData);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let resultado = [...variantes];

    // Filtro de búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      resultado = resultado.filter(
        (v) =>
          v.nombre_producto?.toLowerCase().includes(search) ||
          v.sku?.toLowerCase().includes(search) ||
          JSON.stringify(v.atributos || {})
            .toLowerCase()
            .includes(search)
      );
    }

    // Filtro de categoría
    if (categoriaFilter) {
      resultado = resultado.filter(
        (v) => v.categoria_id === parseInt(categoriaFilter)
      );
    }

    // Filtro de stock
    if (stockFilter === "con-stock") {
      resultado = resultado.filter((v) => v.stock_actual > 0);
    } else if (stockFilter === "sin-stock") {
      resultado = resultado.filter((v) => v.stock_actual === 0);
    } else if (stockFilter === "bajo-stock") {
      resultado = resultado.filter(
        (v) => v.stock_actual > 0 && v.stock_actual <= v.stock_minimo
      );
    }

    setVariantesFiltradas(resultado);
  }, [searchTerm, categoriaFilter, stockFilter, variantes]);

  // Manejo de selección de variantes
  const toggleVariante = (variante) => {
    const newSelected = new Map(selectedVariantes);
    if (newSelected.has(variante.id)) {
      newSelected.delete(variante.id);
    } else {
      newSelected.set(variante.id, { ...variante, cantidad: 1 });
    }
    setSelectedVariantes(newSelected);
  };

  const updateCantidad = (id, cantidad) => {
    const newSelected = new Map(selectedVariantes);
    const variante = newSelected.get(id);
    if (variante) {
      variante.cantidad = Math.max(1, cantidad);
      setSelectedVariantes(newSelected);
    }
  };

  const incrementarCantidad = (id) => {
    const variante = selectedVariantes.get(id);
    if (variante) {
      updateCantidad(id, variante.cantidad + 1);
    }
  };

  const decrementarCantidad = (id) => {
    const variante = selectedVariantes.get(id);
    if (variante && variante.cantidad > 1) {
      updateCantidad(id, variante.cantidad - 1);
    }
  };

  const limpiarSeleccion = () => {
    setSelectedVariantes(new Map());
    toast.info("Selección limpiada");
  };

  const handleGenerarEtiquetas = () => {
    if (selectedVariantes.size === 0) {
      toast.warn("Por favor, selecciona al menos una variante.");
      return;
    }

    const etiquetas = [];
    selectedVariantes.forEach((variante) => {
      for (let i = 0; i < variante.cantidad; i++) {
        etiquetas.push(variante);
      }
    });
    setEtiquetasParaImprimir(etiquetas);
    toast.success(
      `${etiquetas.length} etiquetas generadas. Haz clic en "Ver Vista Previa" para revisarlas.`
    );
  };

  const handleExportPDF = async () => {
    if (etiquetasParaImprimir.length === 0) {
      toast.error("Primero debes generar las etiquetas.");
      return;
    }

    toast.info("Generando PDF, por favor espera...");

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Dimensiones de la etiqueta (2" x 1" = 50.8mm x 25.4mm)
      const labelWidth = 50.8;
      const labelHeight = 25.4;
      const margin = 10;
      const spacing = 5;

      // Calcular cuántas etiquetas caben por fila y columna
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const labelsPerRow = Math.floor(
        (pageWidth - 2 * margin + spacing) / (labelWidth + spacing)
      );
      const labelsPerColumn = Math.floor(
        (pageHeight - 2 * margin + spacing) / (labelHeight + spacing)
      );
      const labelsPerPage = labelsPerRow * labelsPerColumn;

      let labelIndex = 0;

      for (let i = 0; i < etiquetasParaImprimir.length; i++) {
        const etiqueta = etiquetasParaImprimir[i];

        // Calcular posición en el grid
        const posInPage = labelIndex % labelsPerPage;
        const row = Math.floor(posInPage / labelsPerRow);
        const col = posInPage % labelsPerRow;

        const x = margin + col * (labelWidth + spacing);
        const y = margin + row * (labelHeight + spacing);

        // Si no es la primera etiqueta y necesitamos nueva página
        if (i > 0 && posInPage === 0) {
          pdf.addPage();
        }

        // Dibujar borde de la etiqueta
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        pdf.rect(x, y, labelWidth, labelHeight);

        // Dibujar precio
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        const precio = `$${parseFloat(etiqueta.precio).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
        const precioWidth = pdf.getTextWidth(precio);
        pdf.text(precio, x + (labelWidth - precioWidth) / 2, y + 8);

        // Generar código de barras como imagen
        const barcodeCanvas = document.createElement("canvas");
        const JsBarcode = (await import("jsbarcode")).default;
        JsBarcode(barcodeCanvas, etiqueta.sku, {
          format: "CODE128",
          width: 1,
          height: 30,
          displayValue: true,
          fontSize: 10,
          margin: 0,
        });

        // Agregar código de barras al PDF
        const barcodeImage = barcodeCanvas.toDataURL("image/png");
        const barcodeWidth = labelWidth - 4;
        const barcodeHeight = 12;
        pdf.addImage(
          barcodeImage,
          "PNG",
          x + 2,
          y + labelHeight - barcodeHeight - 2,
          barcodeWidth,
          barcodeHeight
        );

        labelIndex++;
      }

      pdf.save("etiquetas-codigos-de-barra.pdf");
      toast.success("PDF exportado exitosamente.");
      setShowPreviewModal(false);
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  // Función para obtener el nombre de la categoría
  const getNombreCategoria = (categoriaId) => {
    const categoria = categorias.find((c) => c.id === categoriaId);
    return categoria ? categoria.nombre : "Sin categoría";
  };

  // Función para formatear atributos
  const formatAtributos = (atributos) => {
    if (!atributos || typeof atributos !== "object") return "";
    return Object.entries(atributos)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | ");
  };

  return (
    <div className="codigos-barra-page">
      {/* Header con controles principales */}
      <div className="page-header">
        <div className="header-info">
          <h1>
            <FontAwesomeIcon icon={faBarcode} /> Generador de Códigos de Barra
          </h1>
          <p className="subtitle">
            Busca productos, selecciona variantes y genera etiquetas para
            imprimir
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-filter"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FontAwesomeIcon icon={faFilter} /> Filtros
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGenerarEtiquetas}
            disabled={selectedVariantes.size === 0}
          >
            <FontAwesomeIcon icon={faBarcode} /> Generar Etiquetas (
            {selectedVariantes.size})
          </button>
          {etiquetasParaImprimir.length > 0 && (
            <button
              className="btn btn-info"
              onClick={() => setShowPreviewModal(true)}
            >
              <FontAwesomeIcon icon={faEye} /> Ver Vista Previa
            </button>
          )}
          <button
            className="btn btn-success"
            onClick={handleExportPDF}
            disabled={etiquetasParaImprimir.length === 0}
          >
            <FontAwesomeIcon icon={faFilePdf} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, SKU o atributos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm("")}
              title="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Categoría:</label>
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Estado de Stock:</label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="filter-select"
            >
              <option value="todos">Todos</option>
              <option value="con-stock">Con stock disponible</option>
              <option value="sin-stock">Sin stock</option>
              <option value="bajo-stock">Stock bajo (≤ mínimo)</option>
            </select>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm("");
              setCategoriaFilter("");
              setStockFilter("todos");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Contador de resultados */}
      <div className="results-info">
        <p>
          Mostrando <strong>{variantesFiltradas.length}</strong> de{" "}
          <strong>{variantes.length}</strong> variantes
          {selectedVariantes.size > 0 && (
            <>
              {" "}
              · <strong>{selectedVariantes.size}</strong> seleccionadas
              <button className="btn-link" onClick={limpiarSeleccion}>
                <FontAwesomeIcon icon={faTrash} /> Limpiar selección
              </button>
            </>
          )}
        </p>
      </div>

      {/* Grid de variantes */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando variantes...</p>
        </div>
      ) : variantesFiltradas.length === 0 ? (
        <div className="empty-state">
          <FontAwesomeIcon icon={faSearch} size="3x" />
          <h3>No se encontraron variantes</h3>
          <p>
            Intenta ajustar los filtros o la búsqueda para ver más resultados.
          </p>
        </div>
      ) : (
        <div className="variantes-grid">
          {variantesFiltradas.map((variante) => {
            const isSelected = selectedVariantes.has(variante.id);
            const selectedData = selectedVariantes.get(variante.id);

            return (
              <div
                key={variante.id}
                className={`variante-card ${isSelected ? "selected" : ""}`}
                onClick={() => toggleVariante(variante)}
              >
                <div className="card-header">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleVariante(variante)}
                    onClick={(e) => e.stopPropagation()}
                    className="checkbox-select"
                  />
                  <span className="producto-nombre">
                    {variante.nombre_producto}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">SKU:</span>
                    <span className="value sku">{variante.sku}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Categoría:</span>
                    <span className="value">
                      {getNombreCategoria(variante.categoria_id)}
                    </span>
                  </div>

                  {variante.atributos &&
                    Object.keys(variante.atributos).length > 0 && (
                      <div className="info-row">
                        <span className="label">Atributos:</span>
                        <span className="value atributos">
                          {formatAtributos(variante.atributos)}
                        </span>
                      </div>
                    )}

                  <div className="info-row">
                    <span className="label">Stock:</span>
                    <span
                      className={`value stock ${
                        variante.stock_actual === 0
                          ? "sin-stock"
                          : variante.stock_actual <= variante.stock_minimo
                          ? "bajo-stock"
                          : "con-stock"
                      }`}
                    >
                      {variante.stock_actual || 0} unidades
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div
                    className="card-footer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label>Cantidad de etiquetas:</label>
                    <div className="cantidad-control">
                      <button
                        className="btn-cantidad"
                        onClick={() => decrementarCantidad(variante.id)}
                        disabled={selectedData.cantidad <= 1}
                      >
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={selectedData.cantidad}
                        onChange={(e) =>
                          updateCantidad(
                            variante.id,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="input-cantidad"
                      />
                      <button
                        className="btn-cantidad"
                        onClick={() => incrementarCantidad(variante.id)}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Vista Previa */}
      <BasicModal
        setShow={setShowPreviewModal}
        show={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={
          <div className="modal-title-preview">
            <FontAwesomeIcon icon={faFilePdf} />
            <span>Vista Previa de Etiquetas</span>
          </div>
        }
      >
        <div className="preview-modal-content">
          <div className="preview-header-modal">
            <p>
              {etiquetasParaImprimir.length} etiqueta(s) lista(s) para exportar
            </p>
            <button
              className="btn btn-success btn-modal"
              onClick={handleExportPDF}
            >
              <FontAwesomeIcon icon={faFilePdf} /> Descargar PDF
            </button>
          </div>

          <div className="modal-print-area">
            {/* NO USAMOS GRID AQUÍ. Cada etiqueta debe ser capturada de forma independiente. */}
            <div className="etiquetas-container-preview">
              {etiquetasParaImprimir.map((etiqueta, index) => (
                // 1. Clase CLAVE para la nueva función de exportar
                <div
                  key={index}
                  className="etiqueta-imprimible etiqueta-4x6-preview"
                  // 2. Estilo de una sola columna para que se capturen individualmente
                  style={{ marginBottom: "5px" }}
                >
                  {/* Este es el contenido de TU etiqueta */}
                  {/*
                    <p className="text-sm font-bold text-black break-words">
                      {etiqueta.nombre_producto}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatAtributos(etiqueta.atributos)}
                    </p>
                 */}
                  <p className="text-lg font-extrabold text-black my-1">
                    $
                    {parseFloat(etiqueta.precio).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <div className="w-full max-h-12 mt-0">
                    <Barcode
                      value={etiqueta.sku}
                      height={40}
                      fontSize={12}
                      margin={2}
                      width={1.5}
                      displayValue={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BasicModal>
    </div>
  );
};

export default CodigosBarra;
