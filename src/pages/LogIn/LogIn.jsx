import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logoCuadradoLetras.png";
import "./LogIn.scss";
import { toast } from "react-toastify";

import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { obtenerUsuario } from "../../services/usuariosService";

const LogIn = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();

  const setRolesInStorage = (rolesArr) => {
    const roles = Array.isArray(rolesArr) ? rolesArr : [];
    localStorage.setItem("app_roles", JSON.stringify(roles));
    localStorage.setItem("app_role", roles[0] || ""); // opcional, primer rol
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.warning("Por favor, completa todos los campos.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1) Autenticar
      const cred = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // 2) Perfil en Firestore (rol o roles)
      const perfil = await obtenerUsuario(cred.user.uid);
      // poner datos del perfil en el contexto
      
      console.log(perfil);
      const rolesFromPerfil = Array.isArray(perfil?.roles)
        ? perfil.roles
        : perfil?.rol
        ? [perfil.rol]
        : [];

      // 3) Intentar leer custom claims (si los usas para roles)
      let roles = rolesFromPerfil;
      try {
        const tokenResult = await cred.user.getIdTokenResult(true);
        const claimRoles = tokenResult?.claims?.roles;
        if (Array.isArray(claimRoles) && claimRoles.length) {
          roles = claimRoles; // prioridad a claims si existen
        }
      } catch {
        // ignorar errores de claims
      }

      // 4) Guardar en storage para que el Sidebar filtre el menú
      setRolesInStorage(roles);

      // 5) (Opcional) guardar info útil del usuario
      localStorage.setItem(
        "app_user",
        JSON.stringify({
          uid: cred.user.uid,
          email: cred.user.email,
          nombre: perfil?.nombre || "",
          roles,
        })
      );

      toast.success("Inicio de sesión exitoso");
      navigate("/", { replace: true }); // o "/home"
    } catch (err) {
      console.error(err);
      const msg =
        err.code === "auth/wrong-password"
          ? "Contraseña incorrecta."
          : err.code === "auth/user-not-found"
          ? "Usuario no encontrado."
          : err.response?.data?.message || "Error al iniciar sesión.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-dark">
      <div className="card p-4" style={{ maxWidth: 400, width: "100%" }}>
        <div className="card-body">
          <div className="logo mb-3">
            <img src={logo} alt="Logo ServiHogar e Industrial" />
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
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  Cargando...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LogIn;
