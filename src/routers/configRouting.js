import Empleados from "../pages/Empleados/Empleados";
import Home from "../pages/Home/Home";
import ProductosScreen from "../pages/Productos/Productos";
import RegistroProducto from "../pages/Productos/RegistrarProductos";
import TiendasScreen from "../pages/Tiendas/Tiendas";
import RegistroUsuario from "../pages/Usuarios/Registro.Usuario";
import Usuarios from "../pages/Usuarios/Usuarios";

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
    page: RegistroUsuario,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "/usuarios",
    page: Usuarios,
    roles: ["ADMIN"],
  },
  {
    path: "/tiendas",
    page: TiendasScreen,
    roles: ["ADMIN"],
  },
  {
    path: "/productos",
    page: ProductosScreen,
    roles: ["ADMIN"],
  },
  {
    path: "/empleados",
    page: Empleados,
    roles: ["ADMIN"],
  },
];

export default configRouting;
