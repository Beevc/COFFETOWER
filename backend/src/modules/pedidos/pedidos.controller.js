const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const TZ = "America/Santiago";

const publicPedido = (p) => ({
  id: p.id,
  ventaNumero: p.numero,
  estado: p.estado,
  momento: p.momento,
  horaProgramada: p.hora_programada,
  esConvenio: p.es_convenio,
  items: p.items || [],
  createdAt: p.created_at,
  preparadoEn: p.preparado_en,
  preparadoPor: p.preparado_por,
});

const ITEMS_SUBQUERY = `
  (SELECT json_agg(json_build_object('nombre', vi.nombre, 'cantidad', vi.cantidad) ORDER BY vi.id)
     FROM venta_item vi WHERE vi.venta_id = v.id) AS items`;

// GET /api/pedidos/pendientes
const pendientes = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.estado, p.momento, p.hora_programada, p.created_at,
            v.numero, v.es_convenio, ${ITEMS_SUBQUERY}
       FROM pedido p JOIN venta v ON v.id = p.venta_id
      WHERE p.local_id = $1 AND p.estado = 'pendiente'
      ORDER BY
        CASE p.momento WHEN 'al_momento' THEN 0 WHEN 'programado' THEN 1 ELSE 2 END,
        p.hora_programada NULLS LAST,
        p.created_at ASC`,
    [req.user.localId]
  );
  res.json({ pedidos: rows.map(publicPedido) });
});

// GET /api/pedidos/preparados-hoy
const preparadosHoy = asyncHandler(async (req, res) => {
  const inicioHoy = `(date_trunc('day', (now() AT TIME ZONE '${TZ}')) AT TIME ZONE '${TZ}')`;
  const { rows } = await query(
    `SELECT p.id, p.estado, p.momento, p.hora_programada, p.created_at, p.preparado_en,
            v.numero, v.es_convenio, u.nombre AS preparado_por, ${ITEMS_SUBQUERY}
       FROM pedido p
       JOIN venta v ON v.id = p.venta_id
       LEFT JOIN usuario u ON u.id = p.preparado_por_id
      WHERE p.local_id = $1 AND p.estado = 'preparado'
        AND p.preparado_en >= ${inicioHoy}
      ORDER BY p.preparado_en DESC`,
    [req.user.localId]
  );
  res.json({ pedidos: rows.map(publicPedido) });
});

// POST /api/pedidos/:id/preparar
const preparar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query(
    `UPDATE pedido
        SET estado = 'preparado', preparado_por_id = $1, preparado_en = now()
      WHERE id = $2 AND local_id = $3 AND estado = 'pendiente'
      RETURNING id`,
    [req.user.id, id, req.user.localId]
  );
  if (rows.length === 0) {
    throw new HttpError(400, "El pedido no existe o ya fue preparado");
  }
  res.json({ ok: true });
});

module.exports = { pendientes, preparadosHoy, preparar };
