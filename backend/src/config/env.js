const dotenv = require("dotenv");
dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

const env = {
  databaseUrl: required("DATABASE_URL"),
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
  seed: {
    localNombre: process.env.SEED_LOCAL_NOMBRE || "Local Frappé",
    localDireccion: process.env.SEED_LOCAL_DIRECCION || "Dirección del local",
    adminNombre: process.env.SEED_ADMIN_NOMBRE || "Administrador",
    adminEmail: process.env.SEED_ADMIN_EMAIL || "admin@frappe.local",
    adminPassword: process.env.SEED_ADMIN_PASSWORD || "admin1234",
  },
};

module.exports = { env };
