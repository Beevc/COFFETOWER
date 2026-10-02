const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const UNIDAD = { dia: "day", semana: "week", mes: "month" };
const TZ = "America/Santiago";
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

// Construye el filtro de rango: por fechas (desde/hasta) o por periodo (hasta ahora).
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

  // Las 4 consultas son independientes -> se corren en paralelo (más rápido).
  const [{ rows: r1 }, { rows: medios }, { rows: ranking }, { rows: conv }] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(total),0)::int AS total, COUNT(*)::int AS n_ventas
         FROM venta
        WHERE local_id = $1 AND estado = 'activa' AND es_convenio = false ${r.cond("created_at")}`, p),
    query(
      `SELECT medio_pago AS medio, COALESCE(SUM(total),0)::int AS total, COUNT(*)::int AS n
         FROM venta
        WHERE local_id = $1 AND estado = 'activa' AND es_convenio = false ${r.cond("created_at")}
        GROUP BY medio_pago ORDER BY total DESC`, p),
    query(
      `SELECT vi.producto_id AS "productoId", vi.nombre,
              SUM(vi.cantidad)::int AS cantidad, SUM(vi.subtotal)::int AS total
         FROM venta_item vi JOIN venta v ON v.id = vi.venta_id
        WHERE v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = false ${r.cond("v.created_at")}
        GROUP BY vi.producto_id, vi.nombre ORDER BY cantidad DESC`, p),
    query(
      `SELECT COUNT(DISTINCT v.id)::int AS n, COALESCE(SUM(vi.cantidad),0)::int AS unidades
         FROM venta v LEFT JOIN venta_item vi ON vi.venta_id = v.id
        WHERE v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = true ${r.cond("v.created_at")}`, p),
  ]);

  const total = r1[0].total;
  const nVentas = r1[0].n_ventas;
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

// GET /api/estadisticas/periodos?tipo=semana|mes&n=6[&hasta=YYYY-MM-DD]
//  -> total de los últimos n periodos terminando en el periodo de `hasta` (o ahora).
const periodos = asyncHandler(async (req, res) => {
  const tipo = req.query.tipo === "mes" ? "mes" : "semana";
  let n = parseInt(req.query.n, 10);
  if (!(n >= 1 && n <= 24)) n = 6;
  const unidad = tipo === "mes" ? "month" : "week";
  const step = tipo === "mes" ? "interval '1 month'" : "interval '1 week'";
  const finExpr = tipo === "mes"
    ? "(p.inicio + interval '1 month' - interval '1 day')::date"
    : "(p.inicio + interval '6 day')::date";

  const params = [req.user.localId, n];
  let anclaExpr;
  if (isDate(req.query.hasta)) {
    params.push(req.query.hasta);
    anclaExpr = `date_trunc('${unidad}', $3::date)`;
  } else {
    anclaExpr = `date_trunc('${unidad}', (now() AT TIME ZONE '${TZ}'))`;
  }

  const { rows } = await query(
    `WITH per AS (
       SELECT gs::date AS inicio
         FROM generate_series(
           ${anclaExpr} - (${step} * ($2 - 1)),
           ${anclaExpr},
           ${step}) gs
     )
     SELECT to_char(p.inicio, 'YYYY-MM-DD') AS inicio,
            to_char(${finExpr}, 'YYYY-MM-DD') AS fin,
            COALESCE(SUM(v.total),0)::int AS total, COUNT(v.id)::int AS n
       FROM per p
       LEFT JOIN venta v ON v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = false
            AND (v.created_at AT TIME ZONE '${TZ}')::date BETWEEN p.inicio AND ${finExpr}
      GROUP BY p.inicio ORDER BY p.inicio`,
    params
  );
  res.json({ tipo, periodos: rows.map((r) => ({ inicio: r.inicio, fin: r.fin, total: r.total, nVentas: r.n })) });
});

// GET /api/estadisticas/ventas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
//  -> lista de ventas del rango (para el detalle expandible por forma de pago).
const ventasDetalle = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  if (!isDate(desde) || !isDate(hasta)) throw new HttpError(400, "Fechas inválidas");
  const { rows } = await query(
    `SELECT v.id, v.numero, v.medio_pago AS medio, v.total,
            COALESCE(NULLIF(TRIM(ped.nombre_cliente), ''), cli.nombre) AS nombre,
            v.created_at AS "createdAt"
       FROM venta v
       LEFT JOIN pedido ped ON ped.venta_id = v.id
       LEFT JOIN cliente cli ON cli.id = v.cliente_id
      WHERE v.local_id = $1 AND v.estado = 'activa' AND v.es_convenio = false
        AND (v.created_at AT TIME ZONE '${TZ}')::date BETWEEN $2 AND $3
      ORDER BY v.medio_pago, v.created_at`,
    [req.user.localId, desde, hasta]
  );
  res.json({ ventas: rows });
});

module.exports = { resumen, serie, periodos, ventasDetalle };

// GET /api/estadisticas/conteo[?desde=YYYY-MM-DD&hasta=YYYY-MM-DD]
//  -> cuántas unidades por producto (sabor) y por opción (proteína, etc.).
//  Sin fechas: histórico completo. Incluye convenio (son frappes realizados), excluye anuladas.
const conteo = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  const params = [req.user.localId];
  let cond = "";
  if (isDate(desde) && isDate(hasta)) {
    params.push(desde, hasta);
    cond = `AND (v.created_at AT TIME ZONE '${TZ}')::date BETWEEN $2 AND $3`;
  }
  const [{ rows: prods }, { rows: ops }] = await Promise.all([
    query(
      `SELECT vi.producto_id AS "productoId", vi.nombre, SUM(vi.cantidad)::int AS cantidad
         FROM venta_item vi JOIN venta v ON v.id = vi.venta_id
        WHERE v.local_id = $1 AND v.estado <> 'anulada' ${cond}
        GROUP BY vi.producto_id, vi.nombre ORDER BY cantidad DESC, vi.nombre`, params),
    query(
      `SELECT vio.nombre, SUM(vi.cantidad)::int AS cantidad
         FROM venta_item_opcion vio
         JOIN venta_item vi ON vi.id = vio.venta_item_id
         JOIN venta v ON v.id = vi.venta_id
        WHERE v.local_id = $1 AND v.estado <> 'anulada' ${cond}
        GROUP BY vio.nombre ORDER BY cantidad DESC, vio.nombre`, params),
  ]);
  const total = prods.reduce((s, p) => s + Number(p.cantidad), 0);
  res.json({
    total,
    productos: prods.map((p) => ({ productoId: p.productoId, nombre: p.nombre, cantidad: Number(p.cantidad) })),
    opciones: ops.map((o) => ({ nombre: o.nombre, cantidad: Number(o.cantidad) })),
  });
});
module.exports.conteo = conteo;
