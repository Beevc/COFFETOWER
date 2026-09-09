const { z } = require("zod");
const { pool, query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const abrirSchema = z.object({
  montoInicial: z.number().int("Debe ser un entero").min(0, "No puede ser negativo"),
});

const cerrarSchema = z.object({
  efectivoContado: z.number().int("Debe ser un entero").min(0, "No puede ser negativo"),
});

const publicTurno = (t) => ({
  id: t.id,
  estado: t.estado,
  cajeroId: t.cajero_id,
  cajeroNombre: t.cajero_nombre,
  montoInicial: t.monto_inicial,
  abiertaEn: t.abierta_en,
  cerradaEn: t.cerrada_en,
  efectivoEsperado: t.efectivo_esperado,
  efectivoContado: t.efectivo_contado,
  diferencia: t.diferencia,
});

// Devuelve el turno abierto del local (o null) con nombre del cajero.
async function turnoAbierto(localId) {
  const { rows } = await query(
    `SELECT t.*, u.nombre AS cajero_nombre
       FROM caja_turno t
       JOIN usuario u ON u.id = t.cajero_id
      WHERE t.local_id = $1 AND t.estado = 'abierta'
      LIMIT 1`,
    [localId]
  );
  return rows[0] || null;
}

// Suma las ventas activas del turno por medio de pago.
async function totalesTurno(turnoId) {
  const { rows } = await query(
    `SELECT
        COALESCE(SUM(total), 0)::int AS total,
        COALESCE(SUM(total) FILTER (WHERE medio_pago = 'efectivo'), 0)::int AS efectivo,
        COUNT(*)::int AS n_ventas
       FROM venta
      WHERE caja_turno_id = $1 AND estado = 'activa'`,
    [turnoId]
  );
  return rows[0];
}

// GET /api/caja/estado  -> turno abierto (con totales) o null
const estado = asyncHandler(async (req, res) => {
  const turno = await turnoAbierto(req.user.localId);
  if (!turno) return res.json({ turno: null });
  const totales = await totalesTurno(turno.id);
  res.json({ turno: { ...publicTurno(turno), totales } });
});

// POST /api/caja/abrir
const abrir = asyncHandler(async (req, res) => {
  const { montoInicial } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO caja_turno (local_id, cajero_id, monto_inicial)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.localId, req.user.id, montoInicial]
    );
    const turno = { ...rows[0], cajero_nombre: req.user.nombre };
    res.status(201).json({ turno: publicTurno(turno) });
  } catch (err) {
    // Índice único parcial: ya hay una caja abierta.
    if (err.code === "23505") {
      throw new HttpError(409, "Ya hay una caja abierta en el local");
    }
    throw err;
  }
});

// POST /api/caja/cerrar
const cerrar = asyncHandler(async (req, res) => {
  const { efectivoContado } = req.body;
  const turno = await turnoAbierto(req.user.localId);
  if (!turno) throw new HttpError(400, "No hay ninguna caja abierta");

  const totales = await totalesTurno(turno.id);
  const esperado = turno.monto_inicial + totales.efectivo;
  const diferencia = efectivoContado - esperado;

  const { rows } = await query(
    `UPDATE caja_turno
        SET estado = 'cerrada',
            cerrada_en = now(),
            cerrado_por_id = $1,
            efectivo_esperado = $2,
            efectivo_contado = $3,
            diferencia = $4
      WHERE id = $5
      RETURNING *`,
    [req.user.id, esperado, efectivoContado, diferencia, turno.id]
  );
  const cerrado = { ...rows[0], cajero_nombre: turno.cajero_nombre };
  res.json({ turno: { ...publicTurno(cerrado), totales } });
});

module.exports = { estado, abrir, cerrar, abrirSchema, cerrarSchema, turnoAbierto };
