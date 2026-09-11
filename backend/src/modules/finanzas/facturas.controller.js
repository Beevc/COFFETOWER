const { z } = require("zod");
const { pool, query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const CATEGORIAS = ["insumos", "arriendo", "sueldos", "servicios", "equipamiento", "otros"];
const MEDIOS = ["efectivo", "debito", "credito", "transferencia"];
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

const itemSchema = z.object({
  insumoId: z.number().int().positive(),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
});

const createSchema = z.object({
  proveedorId: z.number().int().positive().nullable().optional(),
  numero: z.string().trim().max(60).optional(),
  categoria: z.enum(CATEGORIAS, { message: "Categoría inválida" }),
  descripcion: z.string().trim().max(300).optional(),
  fechaEmision: fecha,
  fechaVencimiento: fecha.optional(),
  montoTotal: z.number().int("El monto debe ser entero").min(0, "No puede ser negativo"),
  items: z.array(itemSchema).max(50).optional(),
  // Pago inicial opcional (para marcarla pagada al crear).
  pagoInicial: z
    .object({
      monto: z.number().int().positive(),
      medioPago: z.enum(MEDIOS),
      fecha: fecha.optional(),
      nota: z.string().trim().max(200).optional(),
    })
    .optional(),
});

const updateSchema = z
  .object({
    proveedorId: z.number().int().positive().nullable().optional(),
    numero: z.string().trim().max(60).nullable().optional(),
    categoria: z.enum(CATEGORIAS).optional(),
    descripcion: z.string().trim().max(300).nullable().optional(),
    fechaEmision: fecha.optional(),
    fechaVencimiento: fecha.nullable().optional(),
    montoTotal: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nada para actualizar" });

const pagoSchema = z.object({
  monto: z.number().int().positive("El monto debe ser mayor a 0"),
  medioPago: z.enum(MEDIOS, { message: "Medio de pago inválido" }),
  fecha: fecha.optional(),
  nota: z.string().trim().max(200).optional(),
});

// Estado calculado a partir de lo pagado.
function estadoDe(montoTotal, pagado) {
  if (pagado <= 0) return "pendiente";
  if (pagado >= montoTotal) return "pagada";
  return "parcial";
}

const publicFactura = (f) => {
  const montoTotal = Number(f.monto_total);
  const pagado = Number(f.pagado || 0);
  const saldo = Math.max(0, montoTotal - pagado);
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    id: f.id,
    proveedorId: f.proveedor_id,
    proveedorNombre: f.proveedor_nombre || null,
    numero: f.numero,
    categoria: f.categoria,
    descripcion: f.descripcion,
    fechaEmision: f.fecha_emision,
    fechaVencimiento: f.fecha_vencimiento,
    montoTotal,
    pagado,
    saldo,
    estado: estadoDe(montoTotal, pagado),
    vencida: !!(f.fecha_vencimiento && saldo > 0 && String(f.fecha_vencimiento).slice(0, 10) < hoy),
    createdAt: f.created_at,
  };
};

const SELECT_FACTURA = `
  SELECT f.*, pr.nombre AS proveedor_nombre,
         COALESCE((SELECT SUM(monto) FROM pago WHERE factura_id = f.id), 0) AS pagado
    FROM factura f
    LEFT JOIN proveedor pr ON pr.id = f.proveedor_id`;

// GET /api/finanzas/facturas?estado=&proveedorId=&categoria=&desde=&hasta=
const list = asyncHandler(async (req, res) => {
  const params = [req.user.localId];
  let sql = `${SELECT_FACTURA} WHERE f.local_id = $1`;
  if (req.query.proveedorId) { params.push(Number(req.query.proveedorId)); sql += ` AND f.proveedor_id = $${params.length}`; }
  if (req.query.categoria) { params.push(req.query.categoria); sql += ` AND f.categoria = $${params.length}`; }
  if (req.query.desde) { params.push(req.query.desde); sql += ` AND f.fecha_emision >= $${params.length}`; }
  if (req.query.hasta) { params.push(req.query.hasta); sql += ` AND f.fecha_emision <= $${params.length}`; }
  sql += " ORDER BY f.fecha_vencimiento NULLS LAST, f.fecha_emision DESC, f.id DESC";
  const { rows } = await query(sql, params);
  let facturas = rows.map(publicFactura);
  // El estado se calcula; se filtra en memoria si lo piden.
  if (req.query.estado) facturas = facturas.filter((f) => f.estado === req.query.estado);
  res.json({ facturas });
});

// GET /api/finanzas/facturas/:id  (con ítems y pagos)
const getOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query(`${SELECT_FACTURA} WHERE f.id = $1 AND f.local_id = $2`, [id, req.user.localId]);
  const factura = rows[0];
  if (!factura) throw new HttpError(404, "Factura no encontrada");

  const { rows: items } = await query(
    `SELECT fi.id, fi.insumo_id AS "insumoId", fi.cantidad, i.nombre, i.unidad
       FROM factura_item fi JOIN insumo i ON i.id = fi.insumo_id
      WHERE fi.factura_id = $1 ORDER BY fi.id`,
    [id]
  );
  const { rows: pagos } = await query(
    `SELECT id, fecha, monto, medio_pago AS "medioPago", nota, created_at AS "createdAt"
       FROM pago WHERE factura_id = $1 ORDER BY fecha ASC, id ASC`,
    [id]
  );
  res.json({
    factura: {
      ...publicFactura(factura),
      items: items.map((it) => ({ ...it, cantidad: Number(it.cantidad) })),
      pagos: pagos.map((p) => ({ ...p, monto: Number(p.monto) })),
    },
  });
});

async function facturaDelLocal(id, localId, runner = query) {
  const { rows } = await runner(`${SELECT_FACTURA} WHERE f.id = $1 AND f.local_id = $2`, [id, localId]);
  return rows[0] || null;
}

// POST /api/finanzas/facturas
const create = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const {
    proveedorId = null, numero, categoria, descripcion,
    fechaEmision, fechaVencimiento, montoTotal, items = [], pagoInicial,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (proveedorId) {
      const { rows: pr } = await client.query(
        "SELECT id FROM proveedor WHERE id = $1 AND local_id = $2", [proveedorId, localId]);
      if (!pr[0]) throw new HttpError(400, "El proveedor no existe en el local");
    }

    const { rows: fRows } = await client.query(
      `INSERT INTO factura (local_id, proveedor_id, numero, categoria, descripcion,
                            fecha_emision, fecha_vencimiento, monto_total, creado_por_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [localId, proveedorId, numero || null, categoria, descripcion || null,
       fechaEmision, fechaVencimiento || null, montoTotal, req.user.id]
    );
    const facturaId = fRows[0].id;

    // Ítems de compra -> suman stock (movimiento de ingreso ligado a la factura).
    if (items.length > 0) {
      const ids = [...new Set(items.map((i) => i.insumoId))];
      const { rows: enc } = await client.query(
        "SELECT id FROM insumo WHERE local_id = $1 AND id = ANY($2::int[])", [localId, ids]);
      if (enc.length !== ids.length) throw new HttpError(400, "Algún insumo no existe en el local");
      for (const it of items) {
        await client.query(
          "INSERT INTO factura_item (factura_id, insumo_id, cantidad) VALUES ($1,$2,$3)",
          [facturaId, it.insumoId, it.cantidad]);
        await client.query(
          `INSERT INTO movimiento_inventario (local_id, insumo_id, tipo, cantidad, factura_id, usuario_id, motivo)
           VALUES ($1,$2,'ingreso',$3,$4,$5,$6)`,
          [localId, it.insumoId, it.cantidad, facturaId, req.user.id, `Compra factura${numero ? " N° " + numero : ""}`]);
        await client.query(
          "UPDATE insumo SET stock_actual = stock_actual + $1, updated_at = now() WHERE id = $2",
          [it.cantidad, it.insumoId]);
      }
    }

    // Pago inicial opcional.
    if (pagoInicial) {
      if (pagoInicial.monto > montoTotal) throw new HttpError(400, "El pago inicial supera el monto de la factura");
      await client.query(
        `INSERT INTO pago (local_id, factura_id, fecha, monto, medio_pago, nota, creado_por_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [localId, facturaId, pagoInicial.fecha || fechaEmision, pagoInicial.monto, pagoInicial.medioPago, pagoInicial.nota || null, req.user.id]);
    }

    await client.query("COMMIT");
    const factura = await facturaDelLocal(facturaId, localId);
    res.status(201).json({ factura: publicFactura(factura) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// PATCH /api/finanzas/facturas/:id  (campos básicos; no toca ítems ni stock)
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const actual = await facturaDelLocal(id, localId);
  if (!actual) throw new HttpError(404, "Factura no encontrada");

  const map = {
    proveedorId: "proveedor_id", numero: "numero", categoria: "categoria",
    descripcion: "descripcion", fechaEmision: "fecha_emision",
    fechaVencimiento: "fecha_vencimiento", montoTotal: "monto_total",
  };
  const sets = [];
  const values = [];
  let i = 1;
  for (const [k, col] of Object.entries(map)) {
    if (req.body[k] !== undefined) { sets.push(`${col} = $${i++}`); values.push(req.body[k] === "" ? null : req.body[k]); }
  }
  sets.push("updated_at = now()");
  values.push(id, localId);
  await query(`UPDATE factura SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i}`, values);
  const factura = await facturaDelLocal(id, localId);
  res.json({ factura: publicFactura(factura) });
});

// DELETE /api/finanzas/facturas/:id  (revierte el stock de sus ítems)
const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: fRows } = await client.query(
      "SELECT id FROM factura WHERE id = $1 AND local_id = $2 FOR UPDATE", [id, localId]);
    if (!fRows[0]) throw new HttpError(404, "Factura no encontrada");

    const { rows: items } = await client.query(
      "SELECT insumo_id, cantidad FROM factura_item WHERE factura_id = $1", [id]);
    for (const it of items) {
      await client.query(
        `INSERT INTO movimiento_inventario (local_id, insumo_id, tipo, cantidad, usuario_id, motivo)
         VALUES ($1,$2,'ajuste',$3,$4,$5)`,
        [localId, it.insumo_id, -Number(it.cantidad), req.user.id, `Reversa por eliminar factura #${id}`]);
      await client.query(
        "UPDATE insumo SET stock_actual = stock_actual - $1, updated_at = now() WHERE id = $2",
        [it.cantidad, it.insumo_id]);
    }
    await client.query("DELETE FROM factura WHERE id = $1 AND local_id = $2", [id, localId]);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// POST /api/finanzas/facturas/:id/pagos  (abono)
const addPago = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const { monto, medioPago, fecha: fechaPago, nota } = req.body;

  const actual = await facturaDelLocal(id, localId);
  if (!actual) throw new HttpError(404, "Factura no encontrada");
  const saldo = Math.max(0, Number(actual.monto_total) - Number(actual.pagado));
  if (monto > saldo) throw new HttpError(400, `El abono ($${monto}) supera el saldo pendiente ($${saldo})`);

  await query(
    `INSERT INTO pago (local_id, factura_id, fecha, monto, medio_pago, nota, creado_por_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [localId, id, fechaPago || new Date().toISOString().slice(0, 10), monto, medioPago, nota || null, req.user.id]);
  const factura = await facturaDelLocal(id, localId);
  res.status(201).json({ factura: publicFactura(factura) });
});

// DELETE /api/finanzas/pagos/:id
const removePago = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const { rowCount } = await query("DELETE FROM pago WHERE id = $1 AND local_id = $2", [id, localId]);
  if (rowCount === 0) throw new HttpError(404, "Pago no encontrado");
  res.json({ ok: true });
});

module.exports = {
  list, getOne, create, update, remove, addPago, removePago,
  createSchema, updateSchema, pagoSchema,
};
