// src/components/Sidebar/Sidebar.jsx
import React, { useContext, useState } from "react";
import "./sidebar.scss";
import {
  faBars,
  faBoxesStacked,
  faChildDress,
  faCog,
  faHome,
  faMoneyBill1,
  faShop,
  faSignOutAlt,
  faTag,
  faUsers,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService"; // <-- importamos el nuevo logout()
import { toast } from "react-toastify";
import { AuthContext } from "../../utils/context";

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Sesión cerrada");
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error("Error al cerrar sesión");
    }
  };

  // Obtener el rol del usuario
  // const userRole = user?.rol || "user";

  // ==========================
  // 🚨 Rutas permitidas por rol
  // ==========================
  const permisosPorRol = {
    admin: [
      "Inicio",
      "Ventas",
      "Etiquetas",
      "Productos",
      "Inventario",
      "Usuarios",
      "Tiendas",
    ],
    MANAGER: ["Inicio", "Ventas", "Productos", "Usuarios"],
    TECNICO: ["Inicio", "Órdenes de Trabajo"],
    user: ["Inicio", "Ventas"],
  };

  // ==========================
  // 🧭 Menú completo
  // ==========================
  const menuItems = [
    { title: "Inicio", route: "/home", icon: faHome },
    { title: "Ventas", route: "/ventas", icon: faMoneyBill1 },
    { title: "Etiquetas", route: "/etiquetas", icon: faTag },
    { title: "Productos", route: "/productos", icon: faBoxesStacked },
    { title: "Inventario", route: "/inventario", icon: faWarehouse },
    { title: "Usuarios", route: "/usuarios", icon: faUsers },
    { title: "Tiendas", route: "/tiendas", icon: faShop },
  ];

  // ==========================
  // 🔐 Filtrar por rol
  // ==========================
  const menuPermitido = menuItems.filter((item) =>
    permisosPorRol[user?.rol || "USER"]?.includes(item.title)
  );

  // ==========================
  // 🔽 Menú inferior (sin filtro)
  // ==========================
  const bottomMenuItems = [
    { title: "Ajustes", route: "/ajustes", icon: faCog, action: null },
    { title: "Salir", route: "/login", icon: faSignOutAlt, action: "logout" },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Header Section */}
      <div className="top-section">
        {!isCollapsed && (
          <div className="logo">
            <FontAwesomeIcon icon={faChildDress} />
            <span>El y Ella TPV</span>
          </div>
        )}
        <button
          className="toggle-btn"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      {/* User Profile Section */}
      {user && (
        <div
          className="user-profile"
          title={
            isCollapsed
              ? `${user?.nombre || "Usuario"} - ${user?.rol || "user"}`
              : ""
          }
        >
          <div className="user-avatar">
            {user?.nombre?.charAt(0)?.toUpperCase() ||
              user?.email?.charAt(0)?.toUpperCase() ||
              "U"}
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <span className="user-name">{user?.nombre || "Usuario"}</span>
              <span className="user-role">{user?.rol || "user"}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Navigation */}
      <nav className="sidebar-links">
        {menuPermitido.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            title={isCollapsed ? item.title : ""}
          >
            <FontAwesomeIcon icon={item.icon} className="icon" />
            {!isCollapsed && <span className="title">{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Menu */}
      <div className="bottom-section">
        {bottomMenuItems.map((item) =>
          item.action === "logout" ? (
            <button
              key={item.title}
              className="nav-link bottom-link logout-btn"
              onClick={handleLogout}
              title={isCollapsed ? item.title : ""}
            >
              <FontAwesomeIcon icon={item.icon} className="icon" />
              {!isCollapsed && <span className="title">{item.title}</span>}
            </button>
          ) : (
            <NavLink
              key={item.title}
              to={item.route}
              className="nav-link bottom-link"
              title={isCollapsed ? item.title : ""}
            >
              <FontAwesomeIcon icon={item.icon} className="icon" />
              {!isCollapsed && <span className="title">{item.title}</span>}
            </NavLink>
          )
        )}
      </div>
    </div>
  );
};

export default Sidebar;
