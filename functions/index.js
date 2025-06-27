import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";

import "./admin.js";

import usuariosRouter from "./routes/usuariosRouter.js";
import productoRouter from "./routes/productoRouter.js";
import empleadoRouter from "./routes/empleadoRouter.js";
import tiendaRouter from "./routes/tiendaRouter.js";
import categoriasRouter from "./routes/categoriasRouter.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Montar las rutas de la API
app.use("/usuarios", usuariosRouter);
app.use("/productos", productoRouter);
app.use("/empleados", empleadoRouter);
app.use("/tiendas", tiendaRouter);
app.use("/categorias", categoriasRouter);

// Montar la API

export const api = functions.https.onRequest(app);
