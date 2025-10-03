import CodigosBarra from "../pages/CodigosBarra/CodigosBarra";
import Empleados from "../pages/Empleados/Empleados";
import Home from "../pages/Home/Home";
import ProductosScreen from "../pages/Productos/Productos";
import RegistroProducto from "../pages/Productos/RegistrarProductos";
import Inventario from "../pages/Tiendas/Inventario/Inventario";
import InventarioTest from "../pages/Tiendas/Inventario/Inventario.Test";
import TiendasScreen from "../pages/Tiendas/Tiendas";
import RegistroUsuario from "../pages/Usuarios/Registro.Usuario";
import Usuarios from "../pages/Usuarios/Usuarios";

// ✅ Roles en minúscula para coincidir con la base de datos
const configRouting = [
  {
    path: "/",
    page: Home,
    roles: ["admin", "manager", "tecnico"],
  },
  {
    path: "/registro-productos",
    page: RegistroProducto,
    roles: ["admin", "manager"],
  },
  {
    path: "/registro-usuarios",
    page: RegistroUsuario,
    roles: ["admin", "manager"],
  },
  {
    path: "/usuarios",
    page: Usuarios,
    roles: ["admin"],
  },
  {
    path: "/tiendas",
    page: TiendasScreen,
    roles: ["admin"],
  },
  {
    path: "/tiendas/:tiendaId/inventario",
    page: Inventario,
    roles: ["admin", "manager"],
  },
  {
    path: "/tiendas/:tiendaId/inventarioTest",
    page: InventarioTest,
    roles: ["admin", "manager"],
  },
  {
    path: "/productos",
    page: ProductosScreen,
    roles: ["admin"],
  },
  {
    path: "/empleados",
    page: Empleados,
    roles: ["admin"],
  },
  {
    path: "/codigos-barra",
    page: CodigosBarra,
    roles: ["admin", "manager"],
  },
];

export default configRouting;
