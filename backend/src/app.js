const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const productsRoutes = require("./modules/products/products.routes");
const cajaRoutes = require("./modules/caja/caja.routes");
const ventasRoutes = require("./modules/ventas/ventas.routes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// CORS: si se define CORS_ORIGIN (uno o varios separados por coma) se restringe
// a esos dominios; si no, se permite cualquiera (cómodo en desarrollo).
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin.split(",").map((o) => o.trim()) } : {}));
app.use(express.json());

// Healthcheck simple.
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Rutas de la API.
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/caja", cajaRoutes);
app.use("/api/ventas", ventasRoutes);

// 404 + manejo de errores (siempre al final).
app.use(notFound);
app.use(errorHandler);

module.exports = app;
