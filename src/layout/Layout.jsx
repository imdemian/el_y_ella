// import { useContext } from "react";
import { useState } from "react";
import Sidebar from "./sidebar/sidebar";
import { AuthContext } from "../utils/context";
import "./Layout.scss";

// Añadir setRefreshCheckLogin después
const Layout = ({ children }) => {
  // Obtener el usuario desde el contexto
  // const { user } = useContext(AuthContext);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <>
      <div className="layout-wrapper">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <div
          className={`content-wrapper bg-white ${
            isSidebarCollapsed ? "sidebar-collapsed" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default Layout;
