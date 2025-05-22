import { useContext } from "react";
import { AuthContext } from "../utils/context";
import configRouting from "./configRouting";
import { Route, Routes } from "react-router-dom";
import Layout from "../layout/Layout";

export default function Routing() {
  const { userRole } = useContext(AuthContext);

  // Filtrar las rutas según el rol del usuario
  const filtered = configRouting.filter(
    (route) => !route.roles || route.roles.includes(userRole)
  );

  return (
    <Routes>
      {filtered.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <Layout>
              <route.page />
            </Layout>
          }
        ></Route>
      ))}

      {/* Ruta comodín: si no coincide ninguna, redirige al home o login */}
      <Route
        path="*"
        element={
          userRole ? (
            <Navigate to={filtered[0]?.path || "/"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
