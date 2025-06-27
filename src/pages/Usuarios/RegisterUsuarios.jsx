import React, { useState, useEffect } from "react";
import { crearUsuario } from "../../services/usuariosService";
import { obtenerEmpleados } from "../../services/empleadoService"; // Asegúrate de tener este servicio

const roles = [
  { value: "admin", label: "Administrador" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "dueño", label: "Dueño" },
];

export default function RegistroUsuarios() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    nombre: "",
    rol: "",
    empleadoId: "",
  });
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchEmpleados() {
      try {
        const data = await obtenerEmpleados();
        setEmpleados(data);
      } catch (err) {
        console.error("Error al cargar empleados:", err);
      }
    }
    fetchEmpleados();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await crearUsuario(form);
      setSuccess("Usuario creado exitosamente");
      setForm({ email: "", password: "", nombre: "", rol: "", empleadoId: "" });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">Registrar Nuevo Usuario</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {success && <p className="text-green-500 mb-2">{success}</p>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Contraseña</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Nombre</label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Rol</label>
          <select
            name="rol"
            value={form.rol}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Seleccione un rol</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label className="block mb-1">Empleado Asociado</label>
          <select
            name="empleadoId"
            value={form.empleadoId}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Seleccione un empleado</option>
            {empleados.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Registrando..." : "Registrar Usuario"}
        </button>
      </form>
    </div>
  );
}
