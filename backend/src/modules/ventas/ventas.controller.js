const { z } = require("zod");
const { pool, query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");
const { turnoAbierto } = require("../caja/caja.controller");

const registrarSchema = z.object({
  medioPago: z.enum(["efectivo", "debito", "credito", "transferencia"], {
    message: "Medio de pago inválido",
  }),
  items: z
    .array(
      z.object({
        productoId: z.number().int().positive(),
        cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
      })
    )
    .min(1, "La venta debe tener al menos un producto"),
});

const anularSchema = z.object({
  motivo: z.string().trim().max(300).optional(),
});

const publicVenta = (v) => ({
  id: v.id,
  numero: v.numero,
  total: v.total,
  medioPago: v.medio_pago,
  estado: v.estado,
  cajeroId: v.cajero_id,
  createdAt: v.created_at,
  anuladaEn: v.anulada_en,
  motivoAnulacion: v.motivo_anulacion,
});

// POST /api/ventas
const registrar = asyncHandler(async (req, res) => {
  const { medioPago, items } = req.body;
  const localId = req.user.localId;

  const turno = await turnoAbierto(localId);
  if (!turno) throw new HttpError(400, "Debes abrir la caja antes de vender");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Cargamos los productos referenciados (activos y del local).
    const ids = [...new Set(items.map((i) => i.productoId))];
    const { rows: productos } = await client.query(
      `SELECT id, nombre, precio, activo FROM producto
        WHERE local_id = $1 AND id = ANY($2::int[])`,
      [localId, ids]
    );
    const mapa = new Map(productos.map((p) => [p.id, p]));

    let total = 0;
    const lineas = [];
    for (const item of items) {
      const p = mapa.get(item.productoId);
      if (!p) throw new HttpError(400, `Producto ${item.productoId} no existe en el local`);
      if (!p.activo) throw new HttpError(400, `El producto "${p.nombre}" está inactivo`);
      const subtotal = p.precio * item.cantidad;
      total += subtotal;
      lineas.push({
        productoId: p.id,
        nombre: p.nombre,
        precioUnit: p.precio,
        cantidad: item.cantidad,
        subtotal,
      });
    }

    // Correlativo por local, protegido con advisory lock para evitar choques.
    await client.query("SELECT pg_advisory_xact_lock($1)", [localId]);
    const { rows: maxRows } = await client.query(
      "SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM venta WHERE local_id = $1",
      [localId]
    );
    const numero = maxRows[0].numero;

    const { rows: ventaRows } = await client.query(
      `INSERT INTO venta (local_id, caja_turno_id, cajero_id, numero, total, medio_pago)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [localId, turno.id, req.user.id, numero, total, medioPago]
    );
    const venta = ventaRows[0];

    for (const l of lineas) {
      await client.query(
        `INSERT INTO venta_item (venta_id, producto_id, nombre, precio_unit, cantidad, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [venta.id, l.productoId, l.nombre, l.precioUnit, l.cantidad, l.subtotal]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ venta: { ...publicVenta(venta), items: lineas } });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// GET /api/ventas?turnoId=  -> ventas del turno (por defecto, el turno abierto)
const listar = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  let turnoId = req.query.turnoId ? Number(req.query.turnoId) : null;

  if (!turnoId) {
    const turno = await turnoAbierto(localId);
    if (!turno) return res.json({ ventas: [] });
    turnoId = turno.id;
  }

  const { rows } = await query(
    `SELECT * FROM venta
      WHERE local_id = $1 AND caja_turno_id = $2
      ORDER BY numero DESC`,
    [localId, turnoId]
  );
  res.json({ ventas: rows.map(publicVenta) });
});

// GET /api/ventas/:id  -> venta con su detalle
const detalle = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const id = Number(req.params.id);
  const { rows } = await query(
    "SELECT * FROM venta WHERE id = $1 AND local_id = $2",
    [id, localId]
  );
  const venta = rows[0];
  if (!venta) throw new HttpError(404, "Venta no encontrada");

  const { rows: items } = await query(
    `SELECT producto_id AS "productoId", nombre, precio_unit AS "precioUnit",
            cantidad, subtotal
       FROM venta_item WHERE venta_id = $1 ORDER BY id`,
    [id]
  );
  res.json({ venta: { ...publicVenta(venta), items } });
});

// POST /api/ventas/:id/anular
const anular = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const id = Number(req.params.id);
  const { motivo } = req.body;

  const { rows } = await query(
    `SELECT v.*, t.estado AS turno_estado
       FROM venta v JOIN caja_turno t ON t.id = v.caja_turno_id
      WHERE v.id = $1 AND v.local_id = $2`,
    [id, localId]
  );
  const venta = rows[0];
  if (!venta) throw new HttpError(404, "Venta no encontrada");
  if (venta.estado === "anulada") throw new HttpError(400, "La venta ya está anulada");
  if (venta.turno_estado !== "abierta") {
    throw new HttpError(400, "Solo se pueden anular ventas de la caja abierta");
  }

  const { rows: upd } = await query(
    `UPDATE venta
        SET estado = 'anulada', anulada_en = now(), anulada_por_id = $1, motivo_anulacion = $2
      WHERE id = $3 RETURNING *`,
    [req.user.id, motivo || null, id]
  );
  res.json({ venta: publicVenta(upd[0]) });
});

module.exports = { registrar, listar, detalle, anular, registrarSchema, anularSchema };
