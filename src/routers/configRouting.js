import Ajustes from "../pages/Ajustes/Ajustes";
import Apartados from "../pages/Apartados/Apartados";
import CodigosBarra from "../pages/CodigosBarra/CodigosBarra";
import Empleados from "../pages/Empleados/Empleados";
import Historial from "../pages/Historial/Historial";
import Home from "../pages/Home/Home";
import InventarioGlobal from "../pages/Inventario/Inventario";
import ProductosScreen from "../pages/Productos/Productos";
import RegistroProducto from "../pages/Productos/RegistrarProductos";
import Inventario from "../pages/Tiendas/Inventario/Inventario";
import InventarioTest from "../pages/Tiendas/Inventario/Inventario.Test";
import TiendasScreen from "../pages/Tiendas/Tiendas";
import RegistroUsuario from "../pages/Usuarios/Registro.Usuario";
import Usuarios from "../pages/Usuarios/Usuarios";
import Ventas from "../pages/Ventas/Ventas";
import Preventa from "../pages/Preventa/Preventa";
import Caja from "../pages/Caja/Caja";

// ✅ Roles en minúscula para coincidir con la base de datos
const configRouting = [
  {
    path: "/",
    page: Home,
    roles: ["admin", "manager", "empleado", "cajero", "user"],
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
    path: "/inventario",
    page: InventarioGlobal,
    roles: ["admin", "manager"],
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
    path: "/ajustes",
    page: Ajustes,
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
  {
    path: "/preventa",
    page: Preventa,
    roles: ["admin", "manager", "vendedor", "empleado"],
  },
  {
    path: "/caja",
    page: Caja,
    roles: ["admin", "manager", "cajero"],
  },
  {
    path: "/ventas",
    page: Ventas,
    roles: ["admin", "manager"],
  },
  {
    path: "/historial",
    page: Historial,
    roles: ["admin"],
  },
  {
    path: "/apartados",
    page: Apartados,
    roles: ["admin", "manager", "cajero"],
  },
];

export default configRouting;
