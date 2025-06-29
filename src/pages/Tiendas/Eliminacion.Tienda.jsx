import { useEffect, useState } from "react";
import { obtenerEmpleados } from "../../services/empleadoService";
import { eliminarTienda } from "../../services/tiendaService";
import { toast } from "react-toastify";

const EliminacionTienda = ({ tienda, setShow }) => {
  // Inicializar los datos
  const [formData, setFormData] = useState({
    nombre: tienda?.nombre || "",
    direccion: tienda?.direccion || "",
    telefono: tienda?.telefono || "",
    encargado: tienda?.encargado || "",
  });
  const [alertMessage, setAlertMessage] = useState("");

  // Mensajes de confirmación de eliminación
  const confirmDeleteMessage =
    "¿Estás seguro de que deseas eliminar esta tienda? \n Esta acción no se puede deshacer.";
  const [onPressedConfirmation, setOnPressedConfirmation] = useState(false);

  // Función para verificar que no haya empleados
  const verificarEmpleados = async () => {
    try {
      const response = await obtenerEmpleados();
      let empleadosAsignados = response.some(
        (emp) => emp.tiendaId === tienda.id
      );
      if (empleadosAsignados) {
        setAlertMessage(
          "No se puede eliminar la tienda porque tiene empleados asignados."
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    // Verificar si hay empleados asignados a la tienda
    verificarEmpleados();
  });

  // Función para eliminar la tienda
  const handleDelete = async () => {
    if (!alertMessage) {
      try {
        let response = await eliminarTienda(tienda.id);
        if (response.success) {
          toast.success("Tienda eliminada exitosamente");
          setFormData({
            nombre: "",
            direccion: "",
            telefono: "",
            encargado: "",
          });
          setAlertMessage("");
        } else {
          setAlertMessage("Error al eliminar la tienda: " + response.message);
        }
      } catch (err) {
        let errorMessage = err.response?.data?.message || "Error desconocido";
        toast.error("No se pudo eliminar la tienda: " + errorMessage);
      }
      console.log("Tienda eliminada");
      setShow(false); // Cerrar el modal o componente
    }
  };

  return (
    <div className="eliminacion-empleado-container">
      <div className="row mb-3 align-items-center">
        {alertMessage && (
          <div
            className="alert alert-danger d-flex justify-content-center align-items-center"
            role="alert"
          >
            <h3 className="mb-0">{alertMessage}</h3>
          </div>
        )}
        <div className="col-md-2 d-flex align-items-center">
          <label htmlFor="nombre" className="form-label m-0">
            Nombre
          </label>
        </div>
        <div className="col-md-10">
          <input
            id="nombre"
            name="nombre"
            type="text"
            className="form-control"
            value={formData.nombre}
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="row mb-3 align-items-center">
        <div className="col-md-2">
          <label htmlFor="direccion" className="form-label m-0">
            Dirección
          </label>
        </div>
        <div className="col-md-10">
          <textarea
            id="direccion"
            name="direccion"
            className="form-control"
            rows={3}
            value={formData.direccion}
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="row mb-3 align-items-center">
        <div className="col-md-2">
          <label htmlFor="telefono" className="form-label m-0">
            Teléfono
          </label>
        </div>
        <div className="col-md-10">
          <input
            id="telefono"
            name="telefono"
            type="text"
            className="form-control"
            value={formData.telefono}
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="row mb-3 align-items-center">
        <div className="col-md-2">
          <label htmlFor="encargado" className="form-label m-0">
            Encargado
          </label>
        </div>
        <div className="col-md-10">
          <input
            id="encargado"
            name="encargado"
            type="text"
            className="form-control"
            value={formData.encargado}
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="row">
        <div className="col-12 justify-content-center d-flex">
          <button
            className="btn btn-danger"
            onClick={() => setOnPressedConfirmation(true)}
            disabled={!!alertMessage}
          >
            Eliminar
          </button>
        </div>
        {onPressedConfirmation && (
          <div className="row mt-3 justify-content-center d-flex">
            <p className="text-bg-danger">{confirmDeleteMessage}</p>
            <div className="d-flex justify-content-between align-items-center">
              <button className="btn btn-danger" onClick={() => handleDelete()}>
                Confirmar
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setOnPressedConfirmation(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EliminacionTienda;
