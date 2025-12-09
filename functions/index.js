import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";

import "./admin.js";

// Router de SUPABASE
// import testRouter from "./routes/testRouter.js";
import supAuthRouter from "./routes/authRouter.js";
import supCategoriasRouter from "./routes/categoriasRouter.js";
import supTiendaRouter from "./routes/tiendaRouter.js";
import supUsuariosRouter from "./routes/usuariosRouter.js";
import supEmpleadoRouter from "./routes/empleadoRouter.js";
import supProductoRouter from "./routes/productoRouter.js";
import supVariantesRouter from "./routes/variantesRouter.js";
import supVentasRouter from "./routes/ventasRouter.js";
import supInventarioRouter from "./routes/inventarioRouter.js";
import supComisionesRouter from "./routes/comisionesRouter.js";
import supDescuentosRouter from "./routes/descuentosRouter.js";
import supCodigosAccesoRouter from "./routes/codigosAccesoRouter.js";
import storageRouter from "./routes/storageRouter.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Montar las rutas de la API
// app.use("/test", testRouter);

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
app.use("/supabase/storage", storageRouter);

// Montar la API

export const api = functions.https.onRequest(app);
