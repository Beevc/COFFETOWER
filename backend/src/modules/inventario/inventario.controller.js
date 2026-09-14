const { z } = require("zod");
const { pool, query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const crearSchema = z.object({
  nota: z.string().trim().max(200).optional(),
  items: z
    .array(
      z.object({
        insumoId: z.number().int().positive(),
        stockContado: z.number().min(0, "No puede ser negativo"),
      })
    )
    .min(1, "Debes contar al menos un insumo"),
});

// GET /api/inventario/conteos  -> historial de conteos
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.nota, c.created_at, u.nombre AS usuario,
            COUNT(ci.id)::int AS n_items,
            COUNT(ci.id) FILTER (WHERE ci.diferencia <> 0)::int AS n_ajustes
       FROM inventario_conteo c
       LEFT JOIN inventario_conteo_item ci ON ci.conteo_id = c.id
       LEFT JOIN usuario u ON u.id = c.usuario_id
      WHERE c.local_id = $1
      GROUP BY c.id, u.nombre
      ORDER BY c.created_at DESC LIMIT 100`,
    [req.user.localId]
  );
  res.json({
    conteos: rows.map((c) => ({
      id: c.id, nota: c.nota, createdAt: c.created_at, usuario: c.usuario,
      nItems: c.n_items, nAjustes: c.n_ajustes,
    })),
  });
});

// GET /api/inventario/conteos/:id  -> detalle con diferencias
const getOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rows: cab } = await query(
    `SELECT c.id, c.nota, c.created_at, u.nombre AS usuario
       FROM inventario_conteo c LEFT JOIN usuario u ON u.id = c.usuario_id
      WHERE c.id = $1 AND c.local_id = $2`,
    [id, req.user.localId]
  );
  if (!cab[0]) throw new HttpError(404, "Conteo no encontrado");
  const { rows: items } = await query(
    `SELECT ci.insumo_id AS "insumoId", i.nombre, i.unidad,
            ci.stock_sistema AS "stockSistema", ci.stock_contado AS "stockContado", ci.diferencia
       FROM inventario_conteo_item ci JOIN insumo i ON i.id = ci.insumo_id
      WHERE ci.conteo_id = $1 ORDER BY i.nombre`,
    [id]
  );
  res.json({
    conteo: {
      id: cab[0].id, nota: cab[0].nota, createdAt: cab[0].created_at, usuario: cab[0].usuario,
      items: items.map((r) => ({
        insumoId: r.insumoId, nombre: r.nombre, unidad: r.unidad,
        stockSistema: Number(r.stockSistema), stockContado: Number(r.stockContado), diferencia: Number(r.diferencia),
      })),
    },
  });
});

// POST /api/inventario/conteos  -> guarda el conteo y ajusta el stock a lo contado
const crear = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const { nota, items } = req.body;

  const ids = items.map((i) => i.insumoId);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, "Hay insumos repetidos en el conteo");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validar que todos los insumos sean del local.
    const { rows: enc } = await client.query(
      "SELECT id FROM insumo WHERE local_id = $1 AND id = ANY($2::int[])",
      [localId, ids]
    );
    if (enc.length !== ids.length) throw new HttpError(400, "Algún insumo no existe en el local");

    const { rows: cc } = await client.query(
      "INSERT INTO inventario_conteo (local_id, usuario_id, nota) VALUES ($1,$2,$3) RETURNING id",
      [localId, req.user.id, nota || null]
    );
    const conteoId = cc[0].id;

    let ajustados = 0;
    for (const it of items) {
      const { rows: irows } = await client.query(
        "SELECT stock_actual FROM insumo WHERE id = $1 AND local_id = $2 FOR UPDATE",
        [it.insumoId, localId]
      );
      const sistema = Number(irows[0].stock_actual);
      const diferencia = it.stockContado - sistema;
      await client.query(
        `INSERT INTO inventario_conteo_item (conteo_id, insumo_id, stock_sistema, stock_contado, diferencia)
         VALUES ($1,$2,$3,$4,$5)`,
        [conteoId, it.insumoId, sistema, it.stockContado, diferencia]
      );
      if (diferencia !== 0) {
        ajustados++;
        await client.query(
          `INSERT INTO movimiento_inventario (local_id, insumo_id, tipo, cantidad, usuario_id, motivo)
           VALUES ($1,$2,'ajuste',$3,$4,$5)`,
          [localId, it.insumoId, diferencia, req.user.id, `Conteo inventario #${conteoId}`]
        );
        await client.query(
          "UPDATE insumo SET stock_actual = $1, updated_at = now() WHERE id = $2",
          [it.stockContado, it.insumoId]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ ok: true, conteoId, contados: items.length, ajustados });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { list, getOne, crear, crearSchema };
