const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

const createSchema = z.object({
  tipo: z.enum(["ingreso", "retiro"], { message: "Tipo inválido" }),
  medio: z.enum(["efectivo", "transferencia"], { message: "Medio inválido" }),
  monto: z.number().int("El monto debe ser entero").positive("El monto debe ser mayor a 0"),
  fecha,
  descripcion: z.string().trim().max(200).optional(),
});

const publicMov = (m) => ({
  id: m.id,
  tipo: m.tipo,
  medio: m.medio,
  monto: Number(m.monto),
  fecha: m.fecha,
  descripcion: m.descripcion,
  createdAt: m.created_at,
});

// GET /api/finanzas/movimientos?desde=&hasta=
const list = asyncHandler(async (req, res) => {
  const params = [req.user.localId];
  let sql = "SELECT * FROM movimiento_caja WHERE local_id = $1";
  if (req.query.desde) { params.push(req.query.desde); sql += ` AND fecha >= $${params.length}`; }
  if (req.query.hasta) { params.push(req.query.hasta); sql += ` AND fecha <= $${params.length}`; }
  sql += " ORDER BY fecha DESC, id DESC";
  const { rows } = await query(sql, params);
  res.json({ movimientos: rows.map(publicMov) });
});

// POST /api/finanzas/movimientos
const create = asyncHandler(async (req, res) => {
  const { tipo, medio, monto, fecha: f, descripcion } = req.body;
  const { rows } = await query(
    `INSERT INTO movimiento_caja (local_id, tipo, medio, monto, fecha, descripcion, creado_por_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.localId, tipo, medio, monto, f, descripcion || null, req.user.id]
  );
  res.status(201).json({ movimiento: publicMov(rows[0]) });
});

// DELETE /api/finanzas/movimientos/:id
const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await query(
    "DELETE FROM movimiento_caja WHERE id = $1 AND local_id = $2", [id, req.user.localId]);
  if (rowCount === 0) throw new HttpError(404, "Movimiento no encontrado");
  res.json({ ok: true });
});

module.exports = { list, create, remove, createSchema };
