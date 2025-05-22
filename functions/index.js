import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";

import "./admin.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Montar la API

export const api = functions.https.onRequest(app);
