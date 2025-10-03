import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Routing from "./routers/Routing";
import LogIn from "./pages/LogIn/LogIn";
import { AuthContext } from "./utils/context";
import { ToastContainer } from "react-toastify";
import "./App.scss";
// AuthService ya no es necesario aquí, se usará en los componentes que lo necesiten
import RegisterTest from "./pages/RegsiterTest/RegisterTest";

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  // Este useEffect es para mantener la sesión cuando el usuario refresca la página
  useEffect(() => {
    const checkAuthState = () => {
      try {
        const storedUser = localStorage.getItem("app_user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setUserRole(userData.rol || "");
        }
      } catch (error) {
        console.error("Error al leer la sesión del localStorage:", error);
        setUser(null);
        setUserRole("");
      } finally {
        setLoadingUser(false);
      }
    };
    checkAuthState();
  }, []);

  // ✅ 1. FUNCIÓN DE LOGIN CENTRALIZADA
  // Esta función será llamada desde el componente LogIn.
  // Actualiza el estado de la app y guarda los datos en localStorage.
  const login = (loginData) => {
    const userData = loginData.user;
    setUser(userData);
    setUserRole(userData.rol || "");
    localStorage.setItem("app_user", JSON.stringify(userData));
    localStorage.setItem("auth_token", loginData.session.access_token);
  };

  // ✅ 2. FUNCIÓN DE LOGOUT CENTRALIZADA
  // Esta función se podrá llamar desde cualquier parte de la app (ej: un Header).
  const logout = () => {
    localStorage.removeItem("app_user");
    localStorage.removeItem("auth_token");
    setUser(null);
    setUserRole("");
  };

  if (loadingUser) {
    return (
      <div className="app-loading">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* ✅ 3. PROVEER LAS FUNCIONES A TRAVÉS DEL CONTEXTO */}
      <AuthContext.Provider value={{ user, userRole, login, logout }}>
        <Routes>
          {/* públicas */}
          {/* ✅ 4. RUTA DE LOGIN MEJORADA */}
          {/* Si NO hay usuario, muestra el Login. Si SÍ hay, redirige a la página principal. */}
          <Route
            path="/login"
            element={!user ? <LogIn /> : <Navigate to="/" replace />}
          />
          <Route path="/register-test" element={<RegisterTest />} />

          {/* protegidas */}
          {/* Esta lógica ahora funcionará correctamente */}
          <Route
            path="/*"
            element={user ? <Routing /> : <Navigate to="/login" replace />}
          />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          newestOnTop={false}
          closeOnClick
          draggable
          pauseOnHover
        />
      </AuthContext.Provider>
    </BrowserRouter>
  );
}
