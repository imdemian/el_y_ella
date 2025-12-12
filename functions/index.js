import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

dotenv.config();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Montar las rutas de la API
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

// Ruta base para verificar estado
app.get("/", (req, res) => {
  res.send("API funcionando correctamente 🚀");
});

// Manejo de errores global
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error("Error no controlado:", err);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    // eslint-disable-next-line no-undef
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ✅ Exportar usando la sintaxis Gen 2 (Para evitar el error de Healthcheck)
export const api = onRequest(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 10,
  },
  app
);
