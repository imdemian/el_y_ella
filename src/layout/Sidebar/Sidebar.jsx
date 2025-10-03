// src/components/Sidebar/Sidebar.jsx
import React, { useContext, useState } from "react";
import "./sidebar.scss";
import {
  faArrowLeft,
  faArrowRight,
  faBoxesStacked,
  faChildDress,
  faHome,
  faMoneyBill1,
  faQuestionCircle,
  faScrewdriverWrench,
  faShop,
  faSignOutAlt,
  faTag,
  faUsers,
  faUserTie,
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
      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Error al cerrar sesión");
    }
  };

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
      "Empleados",
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
    { title: "Empleados", route: "/empleados", icon: faUserTie },
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
    { title: "Ayuda", route: "/help", icon: faQuestionCircle, action: null },
    { title: "Salir", route: "/login", icon: faSignOutAlt, action: "logout" },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="top-section">
        {!isCollapsed && (
          <div className="logo">
            <FontAwesomeIcon icon={faChildDress} />
            <span>El y Ella TPV</span>
          </div>
        )}
        <button className="toggle-btn" onClick={toggleSidebar}>
          <FontAwesomeIcon icon={isCollapsed ? faArrowRight : faArrowLeft} />
        </button>
      </div>

      <div className={`sidebar-links ${isCollapsed ? "collapsed" : ""}`}>
        {menuPermitido.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            className="nav-link"
            activeclassname="active"
          >
            <FontAwesomeIcon icon={item.icon} className="icon" />
            {!isCollapsed && <span className="title">{item.title}</span>}
          </NavLink>
        ))}
      </div>

      {!isCollapsed && (
        <div className="bottom-section">
          {bottomMenuItems.map((item) => (
            <div key={item.title} className="nav-link bottom-link">
              <FontAwesomeIcon icon={item.icon} className="icon" />
              <span
                className="title"
                onClick={item.action === "logout" ? handleLogout : undefined}
              >
                {item.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
