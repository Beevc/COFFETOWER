const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const configSchema = z.object({
  activo: z.boolean().optional(),
  umbral: z.number().int().positive().optional(),
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

// Premios por nivel (varias compras -> distintos premios).
const premioSchema = z.object({
  compras: z.number().int().positive("El nº de compras debe ser mayor a 0"),
  tipo: z.enum(["gratis", "monto", "regalo"], { message: "Tipo inválido" }),
  valor: z.number().int().min(0).optional(),
  descripcion: z.string().trim().max(120).optional(),
});
const premioUpdateSchema = z.object({
  compras: z.number().int().positive().optional(),
  tipo: z.enum(["gratis", "monto", "regalo"]).optional(),
  valor: z.number().int().min(0).optional(),
  descripcion: z.string().trim().max(120).nullable().optional(),
  activo: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nada para actualizar" });

const publicConfig = (c) => ({
  activo: c.activo,
  umbral: c.umbral,
  tipoBeneficio: c.tipo_beneficio,
  valor: Number(c.valor),
});

const publicPremio = (p) => ({
  id: p.id,
  compras: p.compras,
  tipo: p.tipo,
  valor: Number(p.valor),
  descripcion: p.descripcion || null,
  activo: p.activo,
});

// Devuelve la config del local, creándola con valores por defecto si no existe.
async function getConfig(localId, runner = query) {
  let { rows } = await runner("SELECT * FROM fidelidad_config WHERE local_id = $1", [localId]);
  if (rows.length === 0) {
    ({ rows } = await runner("INSERT INTO fidelidad_config (local_id) VALUES ($1) RETURNING *", [localId]));
  }
  return rows[0];
}

// Premios activos del local, ordenados por nº de compras ascendente.
async function getPremiosActivos(localId, runner = query) {
  const { rows } = await runner(
    "SELECT * FROM fidelidad_premio WHERE local_id = $1 AND activo = true ORDER BY compras ASC",
    [localId]
  );
  return rows;
}

// Info del cliente + progreso hacia el próximo premio.
const clienteConBeneficio = (cl, config, premios = []) => {
  const contador = cl.compras_contador;
  const proximo = config.activo ? premios.find((p) => p.compras > contador) : null;
  return {
    id: cl.id,
    nombre: cl.nombre,
    telefono: cl.telefono,
    comprasContador: contador,
    activo: cl.activo,
    proximoPremio: proximo ? publicPremio(proximo) : null,
    faltan: proximo ? proximo.compras - contador : null,
    // La próxima compra otorga premio (para destacarlo en el POS).
    beneficioDisponible: !!(proximo && proximo.compras === contador + 1),
    premioEnProximaCompra: !!(proximo && proximo.compras === contador + 1),
  };
};

// ---------- Config ----------
const verConfig = asyncHandler(async (req, res) => {
  const c = await getConfig(req.user.localId);
  res.json({ config: publicConfig(c) });
});

const guardarConfig = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  await getConfig(localId);
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

// ---------- Premios (niveles) ----------
const listPremios = asyncHandler(async (req, res) => {
  const { rows } = await query(
    "SELECT * FROM fidelidad_premio WHERE local_id = $1 ORDER BY compras ASC",
    [req.user.localId]
  );
  res.json({ premios: rows.map(publicPremio) });
});

function normalizaPremio({ tipo, valor, descripcion }) {
  if (tipo === "monto" && !(valor > 0)) throw new HttpError(400, "Indica el monto del descuento");
  if (tipo === "regalo" && !(descripcion && descripcion.trim())) throw new HttpError(400, "Describe el regalo");
  return {
    valor: tipo === "monto" ? valor : 0,
    descripcion: descripcion && descripcion.trim() ? descripcion.trim() : null,
  };
}

const crearPremio = asyncHandler(async (req, res) => {
  const { compras, tipo, valor, descripcion } = req.body;
  const norm = normalizaPremio({ tipo, valor, descripcion });
  try {
    const { rows } = await query(
      `INSERT INTO fidelidad_premio (local_id, compras, tipo, valor, descripcion)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.localId, compras, tipo, norm.valor, norm.descripcion]
    );
    res.status(201).json({ premio: publicPremio(rows[0]) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un premio para ese nº de compras");
    throw err;
  }
});

const actualizarPremio = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const { rows: cur } = await query("SELECT * FROM fidelidad_premio WHERE id=$1 AND local_id=$2", [id, localId]);
  if (!cur[0]) throw new HttpError(404, "Premio no encontrado");
  const merged = {
    tipo: req.body.tipo ?? cur[0].tipo,
    valor: req.body.valor ?? Number(cur[0].valor),
    descripcion: req.body.descripcion !== undefined ? req.body.descripcion : cur[0].descripcion,
  };
  const norm = normalizaPremio(merged);

  const sets = [];
  const values = [];
  let i = 1;
  if (req.body.compras !== undefined) { sets.push(`compras = $${i++}`); values.push(req.body.compras); }
  if (req.body.tipo !== undefined) { sets.push(`tipo = $${i++}`); values.push(req.body.tipo); }
  sets.push(`valor = $${i++}`); values.push(norm.valor);
  sets.push(`descripcion = $${i++}`); values.push(norm.descripcion);
  if (req.body.activo !== undefined) { sets.push(`activo = $${i++}`); values.push(req.body.activo); }
  values.push(id, localId);
  try {
    const { rows } = await query(
      `UPDATE fidelidad_premio SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i} RETURNING *`,
      values
    );
    res.json({ premio: publicPremio(rows[0]) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un premio para ese nº de compras");
    throw err;
  }
});

const eliminarPremio = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await query("DELETE FROM fidelidad_premio WHERE id=$1 AND local_id=$2", [id, req.user.localId]);
  if (rowCount === 0) throw new HttpError(404, "Premio no encontrado");
  res.json({ ok: true });
});

// ---------- Clientes ----------
const listClientes = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const config = await getConfig(localId);
  const premios = await getPremiosActivos(localId);
  const params = [localId];
  let sql = "SELECT * FROM cliente WHERE local_id = $1 AND activo = true";
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    sql += ` AND (nombre ILIKE $${params.length} OR telefono ILIKE $${params.length})`;
  }
  sql += " ORDER BY nombre ASC LIMIT 50";
  const { rows } = await query(sql, params);
  res.json({ clientes: rows.map((c) => clienteConBeneficio(c, config, premios)) });
});

const crearCliente = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const { nombre, telefono } = req.body;
  const config = await getConfig(localId);
  const premios = await getPremiosActivos(localId);
  try {
    const { rows } = await query(
      "INSERT INTO cliente (local_id, nombre, telefono) VALUES ($1,$2,$3) RETURNING *",
      [localId, nombre, telefono || null]
    );
    res.status(201).json({ cliente: clienteConBeneficio(rows[0], config, premios) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un cliente con ese teléfono");
    throw err;
  }
});

const actualizarCliente = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const id = Number(req.params.id);
  const config = await getConfig(localId);
  const premios = await getPremiosActivos(localId);
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
    res.json({ cliente: clienteConBeneficio(rows[0], config, premios) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un cliente con ese teléfono");
    throw err;
  }
});

module.exports = {
  verConfig, guardarConfig,
  listPremios, crearPremio, actualizarPremio, eliminarPremio,
  listClientes, crearCliente, actualizarCliente,
  configSchema, clienteSchema, clienteUpdateSchema, premioSchema, premioUpdateSchema,
  getConfig, getPremiosActivos,
};
