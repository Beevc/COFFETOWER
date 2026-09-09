const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

// periodo -> unidad de date_trunc
const UNIDAD = { dia: "day", semana: "week", mes: "month" };
const TZ = "America/Santiago";

// GET /api/estadisticas?periodo=dia|semana|mes
const resumen = asyncHandler(async (req, res) => {
  const periodo = req.query.periodo || "dia";
  const unidad = UNIDAD[periodo];
  if (!unidad) throw new HttpError(400, "Periodo inválido (usa dia, semana o mes)");
  const localId = req.user.localId;

  // Inicio del periodo actual en horario de Chile, como timestamptz.
  const rango = `(date_trunc('${unidad}', (now() AT TIME ZONE '${TZ}')) AT TIME ZONE '${TZ}')`;

  // Ventas reales (activas, sin convenio) del periodo.
  const { rows: r1 } = await query(
    `SELECT
        COALESCE(SUM(total), 0)::int AS total,
        COUNT(*)::int AS n_ventas
       FROM venta
      WHERE local_id = $1 AND estado = 'activa' AND es_convenio = false
        AND created_at >= ${rango}`,
    [localId]
  );
  const total = r1[0].total;
  const nVentas = r1[0].n_ventas;

  // Desglose por medio de pago.
  const { rows: medios } = await query(
    `SELECT medio_pago AS medio, COALESCE(SUM(total),0)::int AS total, COUNT(*)::int AS n
       FROM venta
      WHERE local_id = $1 AND estado = 'activa' AND es_convenio = false
        AND created_at >= ${rango}
      GROUP BY medio_pago
      ORDER BY total DESC`,
    [localId]
  );

  // Ranking de productos por cantidad vendida (excluye ventas anuladas/convenio).
  const { rows: ranking } = await query(
    `SELECT vi.producto_id AS "productoId", vi.nombre,
            SUM(vi.cantidad)::int AS cantidad,
            SUM(vi.subtotal)::int AS total
       FROM venta_item vi
       JOIN venta v ON v.id = vi.venta_id
      WHERE v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = false
        AND v.created_at >= ${rango}
      GROUP BY vi.producto_id, vi.nombre
      ORDER BY cantidad DESC`,
    [localId]
  );

  // Convenio (frappés regalados) del periodo — como gasto/inversión.
  const { rows: conv } = await query(
    `SELECT COUNT(*)::int AS n,
            COALESCE(SUM(vi.cantidad),0)::int AS unidades
       FROM venta v
       LEFT JOIN venta_item vi ON vi.venta_id = v.id
      WHERE v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = true
        AND v.created_at >= ${rango}`,
    [localId]
  );

  res.json({
    periodo,
    totalVentas: total,
    nVentas,
    ticketPromedio: nVentas > 0 ? Math.round(total / nVentas) : 0,
    porMedioPago: medios.map((m) => ({ medio: m.medio, total: m.total, n: m.n })),
    top: ranking.slice(0, 5),
    bottom: ranking.slice(-5).reverse(),
    convenio: { ventas: conv[0].n, unidades: conv[0].unidades },
  });
});

module.exports = { resumen };
