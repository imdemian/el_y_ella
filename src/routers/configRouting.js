import Empleados from "../pages/Empleados/Empleados";
import Home from "../pages/Home/Home";
import ProductosScreen from "../pages/Productos/Productos";
import RegistroProducto from "../pages/Productos/RegistrarProductos";
import TiendasScreen from "../pages/Tiendas/Tiendas";
import RegistroUsuarios from "../pages/Usuarios/RegisterUsuarios";

const configRouting = [
  {
    path: "/",
    page: Home,
    roles: ["ADMIN", "MANAGER", "TECNICO"],
  },
  {
    path: "/registro-productos",
    page: RegistroProducto,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "/registro-usuarios",
    page: RegistroUsuarios,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "/tiendas",
    page: TiendasScreen,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "/productos",
    page: ProductosScreen,
    roles: ["ADMIN", "MANAGER", "TECNICO"],
  },
  {
    path: "/empleados",
    page: Empleados,
    roles: ["ADMIN", "MANAGER", "TECNICO"],
  },
];

export default configRouting;
