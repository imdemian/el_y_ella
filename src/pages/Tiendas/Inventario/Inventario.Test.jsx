import { useEffect, useState } from "react";
import { obtenerInventarioTienda } from "../../../services/tiendaService";
import { Link, useParams } from "react-router-dom";

export default function InventarioTest() {
  const { tiendaId } = useParams();
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [selectedProd, setSelectedProd] = useState(null);
  const [valoresInventario, setValoresInventario] = useState({});
  ß;
  useEffect(() => {
    async function fetchInventario() {
      try {
        const response = await obtenerInventarioTienda(tiendaId);
        console.log("Inventario:", response);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    }
    fetchInventario();
    setProductos(obtenerProductos());
  }, [tiendaId]);

  // Selección de producto
  const handleProdChange = (e) => {
    const prod = productos.find((p) => p.id === e.target.value) || null;
    setSelectedProd(prod);

    const nuevosValores = {};
    prod?.variantes.forEach((v) => {
      const invRec = inventario.find((i) => i.varianteId === v.id);
      nuevosValores[v.id] = {
        stock: invRec?.stock || 0,
        minimo: invRec?.minimoStock || 0,
        inventarioId: invRec?.id || null,
      };
    });
    setValoresInventario(nuevosValores);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Inventario — Tienda: {tiendaId}</h2>
        <Link to="/tiendas" className="btn btn-secondary">
          ← Volver a Tiendas
        </Link>
      </div>

      {/* Seleccionar productos */}
      <div className="card p-3 mb-4">
        <h5>Seleccionar Producto</h5>
        <div className="row g-3 align-items-end">
          <div className="col-md-6">
            <label className="form-label">Producto</label>
            <select
              className="form-select"
              onChange={handleProdChange}
              value={selectedProd?.id || ""}
            >
              <option value="">— Selecciona —</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventario de producto seleccionado */}
      {selectedProd && (
        <div className="mt-4">
          <h5>Variantes del producto</h5>
        </div>
      )}
    </div>
  );
}

const CrearInventario = () => {
  return (
    <div className="container mt-4">
      <button
        className="btn btn-primary"
        onClick={() => console.log("Inventario Creado")}
      >
        Crear Inventario
      </button>
    </div>
  );
};

function obtenerProductos() {
  return [
    {
      id: "vestido001",
      nombre: "Vestido Clásico",
      variantes: [
        { id: "vestido001-azul-s", atributos: { color: "Azul", talla: "S" } },
        { id: "vestido001-azul-m", atributos: { color: "Azul", talla: "M" } },
        { id: "vestido001-rojo-m", atributos: { color: "Rojo", talla: "M" } },
      ],
    },
    {
      id: "blusa001",
      nombre: "Blusa Floral",
      variantes: [
        { id: "blusa001-verde-s", atributos: { color: "Verde", talla: "S" } },
        { id: "blusa001-verde-m", atributos: { color: "Verde", talla: "M" } },
        { id: "blusa001-rosa-l", atributos: { color: "Rosa", talla: "L" } },
      ],
    },
    {
      id: "falda001",
      nombre: "Falda Larga",
      variantes: [
        { id: "falda001-negro-m", atributos: { color: "Negro", talla: "M" } },
        { id: "falda001-blanco-l", atributos: { color: "Blanco", talla: "L" } },
      ],
    },
  ];
}
