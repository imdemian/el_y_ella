import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";

import "./admin.js";

import usuariosRouter from "./routes/usuariosRouter.js";
import productoRouter from "./routes/productoRouter.js";
import empleadoRouter from "./routes/empleadoRouter.js";
import tiendaRouter from "./routes/tiendaRouter.js";
import categoriasRouter from "./routes/categoriasRouter.js";
import inventarioRouter from "./routes/inventarioRouter.js";

// Router de SUPABASE
// import testRouter from "./routes/testRouter.js";
import supAuthRouter from "./routes_copy/authRouter.js";
import supCategoriasRouter from "./routes_copy/categoriasRouter.js";
import supTiendaRouter from "./routes_copy/tiendaRouter.js";
import supUsuariosRouter from "./routes_copy/usuariosRouter.js";
import supEmpleadoRouter from "./routes_copy/empleadoRouter.js";
import supProductoRouter from "./routes_copy/productoRouter.js";
import supVariantesRouter from "./routes_copy/variantesRouter.js";
import supVentasRouter from "./routes_copy/ventasRouter.js";
import supInventarioRouter from "./routes_copy/inventarioRouter.js";
import supComisionesRouter from "./routes_copy/comisionesRouter.js";
import supDescuentosRouter from "./routes_copy/descuentosRouter.js";
import supCodigosAccesoRouter from "./routes_copy/codigosAccesoRouter.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Montar las rutas de la API
// app.use("/test", testRouter);
app.use("/usuarios", usuariosRouter);
app.use("/productos", productoRouter);
app.use("/empleados", empleadoRouter);
app.use("/tiendas", tiendaRouter);
app.use("/categorias", categoriasRouter);
app.use("/inventario", inventarioRouter);

app.use("/supabase/auth", supAuthRouter);
app.use("/supabase/categorias", supCategoriasRouter);
app.use("/supabase/tiendas", supTiendaRouter);
app.use("/supabase/usuarios", supUsuariosRouter);
app.use("/supabase/empleados", supEmpleadoRouter);
app.use("/supabase/productos", supProductoRouter);
app.use("/supabase/variantes", supVariantesRouter);
app.use("/supabase/ventas", supVentasRouter);
app.use("/supabase/inventario", supInventarioRouter);
app.use("/supabase/comisiones", supComisionesRouter);
app.use("/supabase/descuentos", supDescuentosRouter);
app.use("/supabase/codigos-acceso", supCodigosAccesoRouter);

// Montar la API

export const api = functions.https.onRequest(app);
