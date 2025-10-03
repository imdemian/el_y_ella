import React, { useState, useContext } from "react"; // ✅ 1. Importa useContext
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logoCuadradoLetras.png";
import "./LogIn.scss";
import { toast } from "react-toastify";
import { AuthService } from "../../services/supabase/authService";
import { AuthContext } from "../../utils/context"; // ✅ 2. Importa tu AuthContext

const LogIn = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();

  // ✅ 3. Obtén las funciones 'login' y 'logout' del contexto
  const { login, logout } = useContext(AuthContext);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ✅ 4. USA LA FUNCIÓN LOGOUT DEL CONTEXTO
  // Esto asegura que el estado en App.jsx se limpie correctamente.
  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error("Error en logout del servidor:", error);
    } finally {
      logout(); // Llama a la función del contexto
      navigate("/login", { replace: true });
      toast.info("Sesión cerrada");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.warning("Por favor, completa todos los campos.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1) Autenticar con el backend (esto no cambia)
      const result = await AuthService.login(formData.email, formData.password);

      // ✅ 5. LA PARTE MÁS IMPORTANTE: USA LA FUNCIÓN LOGIN DEL CONTEXTO
      // Esta única línea actualiza el estado en App.jsx Y guarda los datos en localStorage.
      login(result);

      toast.success("Inicio de sesión exitoso");

      // Ahora la navegación funcionará porque App.jsx ya sabe que el usuario existe.
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Error en login:", err);

      let errorMessage = "Error al iniciar sesión";
      if (err.message.includes("Invalid login credentials")) {
        errorMessage = "Email o contraseña incorrectos";
      } else {
        errorMessage = err.message;
      }

      setErrorMsg(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // El JSX no cambia, solo la lógica interna
  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-dark">
      <div className="card p-4" style={{ maxWidth: 400, width: "100%" }}>
        <div className="card-body">
          <div className="logo mb-3">
            <img src={logo} alt="Logo de la empresa" />
          </div>
          <h2 className="card-title text-center mb-4">Iniciar Sesión</h2>
          {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? "Cargando..." : "Iniciar Sesión"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-secondary w-100 mt-2"
            >
              Cerrar Sesión (Test)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LogIn;
