const { query } = require("../../config/db");
const { asyncHandler } = require("../../utils/asyncHandler");

const TZ = "America/Santiago";

// GET /api/finanzas/resumen?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Sin fechas: mes en curso.
const resumen = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const hoyTz = `((now() AT TIME ZONE '${TZ}')::date)`;
  // Rango: por defecto, primer día del mes actual hasta hoy.
  const desde = req.query.desde || null;
  const hasta = req.query.hasta || null;

  // Ingresos = ventas reales (no anuladas, no convenio) en el rango, por fecha local.
  const ingresosSql = `
    SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS n
      FROM venta
     WHERE local_id = $1 AND estado <> 'anulada' AND es_convenio = false
       AND ((created_at AT TIME ZONE '${TZ}')::date)
           BETWEEN COALESCE($2::date, date_trunc('month', ${hoyTz})::date)
               AND COALESCE($3::date, ${hoyTz})`;
  const { rows: ing } = await query(ingresosSql, [localId, desde, hasta]);

  // Gastos = facturas emitidas en el rango.
  const gastosSql = `
    SELECT COALESCE(SUM(monto_total),0) AS total, COUNT(*) AS n
      FROM factura
     WHERE local_id = $1
       AND fecha_emision BETWEEN COALESCE($2::date, date_trunc('month', ${hoyTz})::date)
                             AND COALESCE($3::date, ${hoyTz})`;
  const { rows: gas } = await query(gastosSql, [localId, desde, hasta]);

  // Gastos por categoría en el rango.
  const catSql = `
    SELECT categoria, COALESCE(SUM(monto_total),0) AS total, COUNT(*) AS n
      FROM factura
     WHERE local_id = $1
       AND fecha_emision BETWEEN COALESCE($2::date, date_trunc('month', ${hoyTz})::date)
                             AND COALESCE($3::date, ${hoyTz})
     GROUP BY categoria ORDER BY total DESC`;
  const { rows: cats } = await query(catSql, [localId, desde, hasta]);

  // Cuentas por pagar (todas, no solo del rango): saldo pendiente y vencidas.
  const cxpSql = `
    SELECT
      COALESCE(SUM(saldo),0) AS total_adeudado,
      COUNT(*) FILTER (WHERE saldo > 0) AS n_pendientes,
      COALESCE(SUM(saldo) FILTER (WHERE fecha_vencimiento IS NOT NULL AND fecha_vencimiento < ${hoyTz}),0) AS total_vencido,
      COUNT(*) FILTER (WHERE saldo > 0 AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < ${hoyTz}) AS n_vencidas
    FROM (
      SELECT f.id, f.fecha_vencimiento,
             f.monto_total - COALESCE((SELECT SUM(monto) FROM pago WHERE factura_id = f.id),0) AS saldo
        FROM factura f WHERE f.local_id = $1
    ) s`;
  const { rows: cxp } = await query(cxpSql, [localId]);

  const ingresos = Number(ing[0].total);
  const gastos = Number(gas[0].total);
  res.json({
    ingresos,
    ventasCount: Number(ing[0].n),
    gastos,
    gastosCount: Number(gas[0].n),
    ganancia: ingresos - gastos,
    porCategoria: cats.map((c) => ({ categoria: c.categoria, total: Number(c.total), n: Number(c.n) })),
    cuentasPorPagar: {
      totalAdeudado: Number(cxp[0].total_adeudado),
      pendientes: Number(cxp[0].n_pendientes),
      totalVencido: Number(cxp[0].total_vencido),
      vencidas: Number(cxp[0].n_vencidas),
    },
  });
});

module.exports = { resumen };
