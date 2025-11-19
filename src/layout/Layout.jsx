// import { useContext } from "react";
import { useState } from "react";
import { AuthContext } from "../utils/context";
import "./Layout.scss";
import Sidebar from "./Sidebar/Sidebar";

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
          className={`content-wrapper ${
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
