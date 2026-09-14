const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const UNIDAD = { dia: "day", semana: "week", mes: "month" };
const TZ = "America/Santiago";
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

// Construye el filtro de rango: por fechas (desde/hasta) o por periodo (hasta ahora).
// Devuelve { params, cond(col) } donde los params van después de localId ($1).
function makeRango(req) {
  const { desde, hasta, periodo } = req.query;
  if (isDate(desde) && isDate(hasta)) {
    return {
      params: [desde, hasta],
      cond: (col) => `AND (${col} AT TIME ZONE '${TZ}')::date BETWEEN $2 AND $3`,
    };
  }
  const unidad = UNIDAD[periodo || "dia"];
  if (!unidad) throw new HttpError(400, "Periodo inválido (usa dia, semana o mes)");
  return {
    params: [],
    cond: (col) => `AND ${col} >= (date_trunc('${unidad}', (now() AT TIME ZONE '${TZ}')) AT TIME ZONE '${TZ}')`,
  };
}

// GET /api/estadisticas?periodo=dia|semana|mes  |  ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
const resumen = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const r = makeRango(req);
  const p = [localId, ...r.params];

  const { rows: r1 } = await query(
    `SELECT COALESCE(SUM(total),0)::int AS total, COUNT(*)::int AS n_ventas
       FROM venta
      WHERE local_id = $1 AND estado = 'activa' AND es_convenio = false ${r.cond("created_at")}`,
    p
  );
  const total = r1[0].total;
  const nVentas = r1[0].n_ventas;

  const { rows: medios } = await query(
    `SELECT medio_pago AS medio, COALESCE(SUM(total),0)::int AS total, COUNT(*)::int AS n
       FROM venta
      WHERE local_id = $1 AND estado = 'activa' AND es_convenio = false ${r.cond("created_at")}
      GROUP BY medio_pago ORDER BY total DESC`,
    p
  );

  const { rows: ranking } = await query(
    `SELECT vi.producto_id AS "productoId", vi.nombre,
            SUM(vi.cantidad)::int AS cantidad, SUM(vi.subtotal)::int AS total
       FROM venta_item vi JOIN venta v ON v.id = vi.venta_id
      WHERE v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = false ${r.cond("v.created_at")}
      GROUP BY vi.producto_id, vi.nombre ORDER BY cantidad DESC`,
    p
  );

  const { rows: conv } = await query(
    `SELECT COUNT(DISTINCT v.id)::int AS n, COALESCE(SUM(vi.cantidad),0)::int AS unidades
       FROM venta v LEFT JOIN venta_item vi ON vi.venta_id = v.id
      WHERE v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = true ${r.cond("v.created_at")}`,
    p
  );

  res.json({
    totalVentas: total,
    nVentas,
    ticketPromedio: nVentas > 0 ? Math.round(total / nVentas) : 0,
    porMedioPago: medios.map((m) => ({ medio: m.medio, total: m.total, n: m.n })),
    top: ranking.slice(0, 5),
    bottom: ranking.slice(-5).reverse(),
    convenio: { ventas: conv[0].n, unidades: conv[0].unidades },
  });
});

// GET /api/estadisticas/serie?desde=YYYY-MM-DD&hasta=YYYY-MM-DD  -> total por día (rellena días en 0)
const serie = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  if (!isDate(desde) || !isDate(hasta)) throw new HttpError(400, "Fechas inválidas");
  const { rows } = await query(
    `SELECT to_char(d, 'YYYY-MM-DD') AS fecha,
            COALESCE(SUM(v.total),0)::int AS total, COUNT(v.id)::int AS n
       FROM generate_series($2::date, $3::date, interval '1 day') d
       LEFT JOIN venta v ON v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = false
            AND (v.created_at AT TIME ZONE '${TZ}')::date = d::date
      GROUP BY d ORDER BY d`,
    [req.user.localId, desde, hasta]
  );
  res.json({ dias: rows.map((r) => ({ fecha: r.fecha, total: r.total, nVentas: r.n })) });
});

// GET /api/estadisticas/periodos?tipo=semana|mes&n=6  -> total de los últimos n periodos (para comparar)
const periodos = asyncHandler(async (req, res) => {
  const tipo = req.query.tipo === "mes" ? "mes" : "semana";
  let n = parseInt(req.query.n, 10);
  if (!(n >= 1 && n <= 24)) n = 6;
  const unidad = tipo === "mes" ? "month" : "week";
  const step = tipo === "mes" ? "interval '1 month'" : "interval '1 week'";
  const finExpr = tipo === "mes"
    ? "(p.inicio + interval '1 month' - interval '1 day')::date"
    : "(p.inicio + interval '6 day')::date";

  const { rows } = await query(
    `WITH per AS (
       SELECT gs::date AS inicio
         FROM generate_series(
           date_trunc('${unidad}', (now() AT TIME ZONE '${TZ}')) - (${step} * ($2 - 1)),
           date_trunc('${unidad}', (now() AT TIME ZONE '${TZ}')),
           ${step}) gs
     )
     SELECT to_char(p.inicio, 'YYYY-MM-DD') AS inicio,
            to_char(${finExpr}, 'YYYY-MM-DD') AS fin,
            COALESCE(SUM(v.total),0)::int AS total, COUNT(v.id)::int AS n
       FROM per p
       LEFT JOIN venta v ON v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = false
            AND (v.created_at AT TIME ZONE '${TZ}')::date BETWEEN p.inicio AND ${finExpr}
      GROUP BY p.inicio ORDER BY p.inicio`,
    [req.user.localId, n]
  );
  res.json({ tipo, periodos: rows.map((r) => ({ inicio: r.inicio, fin: r.fin, total: r.total, nVentas: r.n })) });
});

module.exports = { resumen, serie, periodos };
