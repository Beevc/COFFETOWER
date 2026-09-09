const { z } = require("zod");
const { pool, query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const UNIDADES = ["ml", "l", "g", "kg", "unidad"];

const createSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  unidad: z.enum(UNIDADES, { message: "Unidad inválida" }),
  stockInicial: z.number().min(0, "No puede ser negativo").optional(),
  umbralAlerta: z.number().min(0, "No puede ser negativo").optional(),
});

const updateSchema = z
  .object({
    nombre: z.string().trim().min(1).optional(),
    unidad: z.enum(UNIDADES, { message: "Unidad inválida" }).optional(),
    umbralAlerta: z.number().min(0).optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

// Movimiento manual: ingreso, merma o ajuste (el consumo lo hace la venta).
const movimientoSchema = z.object({
  tipo: z.enum(["ingreso", "merma", "ajuste"], { message: "Tipo inválido" }),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  // Para 'ajuste' se puede indicar si suma o resta; ingreso suma, merma resta.
  resta: z.boolean().optional(),
  motivo: z.string().trim().max(300).optional(),
});

const publicInsumo = (i) => ({
  id: i.id,
  nombre: i.nombre,
  unidad: i.unidad,
  stockActual: Number(i.stock_actual),
  umbralAlerta: Number(i.umbral_alerta),
  activo: i.activo,
  stockBajo: Number(i.stock_actual) <= Number(i.umbral_alerta),
});

async function getInsumoDelLocal(id, localId) {
  const { rows } = await query(
    "SELECT * FROM insumo WHERE id = $1 AND local_id = $2",
    [id, localId]
  );
  return rows[0] || null;
}

// GET /api/insumos?soloAlertas=true
const list = asyncHandler(async (req, res) => {
  const params = [req.user.localId];
  let sql = "SELECT * FROM insumo WHERE local_id = $1";
  if (req.query.activo === "true" || req.query.activo === "false") {
    params.push(req.query.activo === "true");
    sql += ` AND activo = $${params.length}`;
  }
  if (req.query.soloAlertas === "true") {
    sql += " AND stock_actual <= umbral_alerta";
  }
  sql += " ORDER BY nombre ASC";
  const { rows } = await query(sql, params);
  res.json({ insumos: rows.map(publicInsumo) });
});

// POST /api/insumos  (crea insumo; si trae stockInicial, registra un ingreso)
const create = asyncHandler(async (req, res) => {
  const { nombre, unidad, stockInicial = 0, umbralAlerta = 0 } = req.body;
  const localId = req.user.localId;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let insumo;
    try {
      const { rows } = await client.query(
        `INSERT INTO insumo (local_id, nombre, unidad, stock_actual, umbral_alerta)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [localId, nombre, unidad, stockInicial, umbralAlerta]
      );
      insumo = rows[0];
    } catch (err) {
      if (err.code === "23505") throw new HttpError(409, "Ya existe un insumo con ese nombre");
      throw err;
    }
    if (stockInicial > 0) {
      await client.query(
        `INSERT INTO movimiento_inventario (local_id, insumo_id, tipo, cantidad, usuario_id, motivo)
         VALUES ($1, $2, 'ingreso', $3, $4, $5)`,
        [localId, insumo.id, stockInicial, req.user.id, "Stock inicial"]
      );
    }
    await client.query("COMMIT");
    res.status(201).json({ insumo: publicInsumo(insumo) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// PATCH /api/insumos/:id  (no cambia stock; el stock se mueve con /movimientos)
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const actual = await getInsumoDelLocal(id, localId);
  if (!actual) throw new HttpError(404, "Insumo no encontrado");

  const { nombre, unidad, umbralAlerta, activo } = req.body;
  const sets = [];
  const values = [];
  let i = 1;
  if (nombre !== undefined) { sets.push(`nombre = $${i++}`); values.push(nombre); }
  if (unidad !== undefined) { sets.push(`unidad = $${i++}`); values.push(unidad); }
  if (umbralAlerta !== undefined) { sets.push(`umbral_alerta = $${i++}`); values.push(umbralAlerta); }
  if (activo !== undefined) { sets.push(`activo = $${i++}`); values.push(activo); }
  sets.push("updated_at = now()");
  values.push(id, localId);
  try {
    const { rows } = await query(
      `UPDATE insumo SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i} RETURNING *`,
      values
    );
    res.json({ insumo: publicInsumo(rows[0]) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un insumo con ese nombre");
    throw err;
  }
});

// POST /api/insumos/:id/movimientos  (ingreso / merma / ajuste)
const registrarMovimiento = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const { tipo, cantidad, resta = false, motivo } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: irows } = await client.query(
      "SELECT * FROM insumo WHERE id = $1 AND local_id = $2 FOR UPDATE",
      [id, localId]
    );
    const insumo = irows[0];
    if (!insumo) throw new HttpError(404, "Insumo no encontrado");

    // Delta según tipo: ingreso suma; merma resta; ajuste según 'resta'.
    let delta;
    if (tipo === "ingreso") delta = cantidad;
    else if (tipo === "merma") delta = -cantidad;
    else delta = resta ? -cantidad : cantidad; // ajuste

    await client.query(
      `INSERT INTO movimiento_inventario (local_id, insumo_id, tipo, cantidad, usuario_id, motivo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [localId, id, tipo, delta, req.user.id, motivo || null]
    );
    const { rows: urows } = await client.query(
      "UPDATE insumo SET stock_actual = stock_actual + $1, updated_at = now() WHERE id = $2 RETURNING *",
      [delta, id]
    );
    await client.query("COMMIT");
    res.status(201).json({ insumo: publicInsumo(urows[0]) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// GET /api/insumos/:id/movimientos  (historial)
const historial = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const insumo = await getInsumoDelLocal(id, localId);
  if (!insumo) throw new HttpError(404, "Insumo no encontrado");
  const { rows } = await query(
    `SELECT m.id, m.tipo, m.cantidad, m.motivo, m.venta_id, m.created_at, u.nombre AS usuario
       FROM movimiento_inventario m
       LEFT JOIN usuario u ON u.id = m.usuario_id
      WHERE m.insumo_id = $1 ORDER BY m.created_at DESC LIMIT 100`,
    [id]
  );
  res.json({
    movimientos: rows.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      cantidad: Number(m.cantidad),
      motivo: m.motivo,
      ventaId: m.venta_id,
      usuario: m.usuario,
      createdAt: m.created_at,
    })),
  });
});

module.exports = {
  list, create, update, registrarMovimiento, historial,
  createSchema, updateSchema, movimientoSchema,
};
