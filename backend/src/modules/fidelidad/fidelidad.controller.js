const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const configSchema = z.object({
  activo: z.boolean().optional(),
  umbral: z.number().int().positive("El umbral debe ser mayor a 0").optional(),
  tipoBeneficio: z.enum(["gratis", "porcentaje"]).optional(),
  valor: z.number().min(0).max(100).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nada para actualizar" });

const clienteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  telefono: z.string().trim().max(30).optional(),
});
const clienteUpdateSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  telefono: z.string().trim().max(30).optional().nullable(),
  activo: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nada para actualizar" });

const publicConfig = (c) => ({
  activo: c.activo,
  umbral: c.umbral,
  tipoBeneficio: c.tipo_beneficio,
  valor: Number(c.valor),
});

// Devuelve la config del local, creándola con valores por defecto si no existe.
async function getConfig(localId, runner = query) {
  let { rows } = await runner("SELECT * FROM fidelidad_config WHERE local_id = $1", [localId]);
  if (rows.length === 0) {
    ({ rows } = await runner(
      "INSERT INTO fidelidad_config (local_id) VALUES ($1) RETURNING *",
      [localId]
    ));
  }
  return rows[0];
}

const clienteConBeneficio = (cl, config) => ({
  id: cl.id,
  nombre: cl.nombre,
  telefono: cl.telefono,
  comprasContador: cl.compras_contador,
  activo: cl.activo,
  beneficioDisponible: config.activo && cl.compras_contador >= config.umbral,
});

// GET /api/fidelidad/config
const verConfig = asyncHandler(async (req, res) => {
  const c = await getConfig(req.user.localId);
  res.json({ config: publicConfig(c) });
});

// PUT /api/fidelidad/config
const guardarConfig = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  await getConfig(localId); // asegura que exista
  const { activo, umbral, tipoBeneficio, valor } = req.body;
  const sets = [];
  const values = [];
  let i = 1;
  const push = (col, val) => { sets.push(`${col} = $${i++}`); values.push(val); };
  if (activo !== undefined) push("activo", activo);
  if (umbral !== undefined) push("umbral", umbral);
  if (tipoBeneficio !== undefined) push("tipo_beneficio", tipoBeneficio);
  if (valor !== undefined) push("valor", valor);
  push("updated_at", new Date());
  values.push(localId);
  const { rows } = await query(
    `UPDATE fidelidad_config SET ${sets.join(", ")} WHERE local_id = $${i} RETURNING *`,
    values
  );
  res.json({ config: publicConfig(rows[0]) });
});

// GET /api/fidelidad/clientes?q=
const listClientes = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const config = await getConfig(localId);
  const params = [localId];
  let sql = "SELECT * FROM cliente WHERE local_id = $1 AND activo = true";
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    sql += ` AND (nombre ILIKE $${params.length} OR telefono ILIKE $${params.length})`;
  }
  sql += " ORDER BY nombre ASC LIMIT 50";
  const { rows } = await query(sql, params);
  res.json({ clientes: rows.map((c) => clienteConBeneficio(c, config)) });
});

// POST /api/fidelidad/clientes
const crearCliente = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const { nombre, telefono } = req.body;
  const config = await getConfig(localId);
  try {
    const { rows } = await query(
      "INSERT INTO cliente (local_id, nombre, telefono) VALUES ($1,$2,$3) RETURNING *",
      [localId, nombre, telefono || null]
    );
    res.status(201).json({ cliente: clienteConBeneficio(rows[0], config) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un cliente con ese teléfono");
    throw err;
  }
});

// PATCH /api/fidelidad/clientes/:id
const actualizarCliente = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const id = Number(req.params.id);
  const config = await getConfig(localId);
  const { nombre, telefono, activo } = req.body;
  const sets = [];
  const values = [];
  let i = 1;
  const push = (col, val) => { sets.push(`${col} = $${i++}`); values.push(val); };
  if (nombre !== undefined) push("nombre", nombre);
  if (telefono !== undefined) push("telefono", telefono || null);
  if (activo !== undefined) push("activo", activo);
  push("updated_at", new Date());
  values.push(id, localId);
  try {
    const { rows } = await query(
      `UPDATE cliente SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i} RETURNING *`,
      values
    );
    if (rows.length === 0) throw new HttpError(404, "Cliente no encontrado");
    res.json({ cliente: clienteConBeneficio(rows[0], config) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un cliente con ese teléfono");
    throw err;
  }
});

module.exports = {
  verConfig, guardarConfig, listClientes, crearCliente, actualizarCliente,
  configSchema, clienteSchema, clienteUpdateSchema, getConfig,
};
