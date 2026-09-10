const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const TZ = "America/Santiago";

// Flujo hacia adelante: cada estado avanza al siguiente.
const SIGUIENTE = {
  pendiente: "en_preparacion",
  en_preparacion: "listo",
  listo: "entregado",
};
// Quién puede dejar el pedido en cada estado.
const ROL_PARA = {
  en_preparacion: ["barista", "admin"],
  listo: ["barista", "admin"],
  entregado: ["cajero", "admin"],
};
const ESTADOS_ACTIVOS = ["pendiente", "en_preparacion", "listo"];

const cambiarEstadoSchema = z.object({
  estado: z.enum(["en_preparacion", "listo", "entregado"], { message: "Estado inválido" }),
});

const publicPedido = (p) => ({
  id: p.id,
  ventaNumero: p.numero,
  nombreCliente: p.nombre_cliente || null,
  estado: p.estado,
  momento: p.momento,
  horaProgramada: p.hora_programada,
  esConvenio: p.es_convenio,
  items: p.items || [],
  createdAt: p.created_at,
  enPreparacionEn: p.en_preparacion_en,
  listoEn: p.listo_en,
  entregadoEn: p.entregado_en,
  preparadoPor: p.preparado_por,
  entregadoPor: p.entregado_por,
});

const ITEMS_SUBQUERY = `
  (SELECT json_agg(json_build_object('productoId', vi.producto_id, 'nombre', vi.nombre, 'cantidad', vi.cantidad) ORDER BY vi.id)
     FROM venta_item vi WHERE vi.venta_id = v.id) AS items`;

const SELECT_PEDIDO = `
  SELECT p.id, p.estado, p.momento, p.hora_programada, p.created_at, p.nombre_cliente,
         p.en_preparacion_en, p.listo_en, p.entregado_en,
         v.numero, v.es_convenio,
         ub.nombre AS preparado_por, ue.nombre AS entregado_por,
         ${ITEMS_SUBQUERY}
    FROM pedido p
    JOIN venta v ON v.id = p.venta_id
    LEFT JOIN usuario ub ON ub.id = p.preparado_por_id
    LEFT JOIN usuario ue ON ue.id = p.entregado_por_id`;

// GET /api/pedidos/activos  -> pendientes + en preparación + listos (para barista y caja)
const activos = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `${SELECT_PEDIDO}
      WHERE p.local_id = $1 AND p.estado = ANY($2::pedido_estado[])
      ORDER BY
        CASE p.estado WHEN 'pendiente' THEN 0 WHEN 'en_preparacion' THEN 1 ELSE 2 END,
        CASE p.momento WHEN 'al_momento' THEN 0 WHEN 'programado' THEN 1 ELSE 2 END,
        p.hora_programada NULLS LAST,
        p.created_at ASC`,
    [req.user.localId, ESTADOS_ACTIVOS]
  );
  res.json({ pedidos: rows.map(publicPedido) });
});

// GET /api/pedidos/entregados-hoy
const entregadosHoy = asyncHandler(async (req, res) => {
  const inicioHoy = `(date_trunc('day', (now() AT TIME ZONE '${TZ}')) AT TIME ZONE '${TZ}')`;
  const { rows } = await query(
    `${SELECT_PEDIDO}
      WHERE p.local_id = $1 AND p.estado = 'entregado' AND p.entregado_en >= ${inicioHoy}
      ORDER BY p.entregado_en DESC`,
    [req.user.localId]
  );
  res.json({ pedidos: rows.map(publicPedido) });
});

// POST /api/pedidos/:id/estado  { estado }
const cambiarEstado = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body;

  const { rows: actualRows } = await query(
    "SELECT id, estado FROM pedido WHERE id = $1 AND local_id = $2",
    [id, req.user.localId]
  );
  const actual = actualRows[0];
  if (!actual) throw new HttpError(404, "Pedido no encontrado");

  // Solo se permite avanzar al estado inmediatamente siguiente.
  if (SIGUIENTE[actual.estado] !== estado) {
    throw new HttpError(400, `No se puede pasar de "${actual.estado}" a "${estado}"`);
  }
  // Y solo el rol que corresponde a ese paso.
  if (!ROL_PARA[estado].includes(req.user.rol)) {
    throw new HttpError(403, "Tu rol no puede hacer este cambio de estado");
  }

  const sets = ["estado = $1"];
  const values = [estado];
  let i = 2;
  if (estado === "en_preparacion") {
    sets.push(`en_preparacion_en = now()`, `preparado_por_id = $${i++}`);
    values.push(req.user.id);
  } else if (estado === "listo") {
    sets.push(`listo_en = now()`, `preparado_por_id = COALESCE(preparado_por_id, $${i++})`);
    values.push(req.user.id);
  } else if (estado === "entregado") {
    sets.push(`entregado_en = now()`, `entregado_por_id = $${i++}`);
    values.push(req.user.id);
  }
  values.push(id, req.user.localId);
  await query(
    `UPDATE pedido SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i}`,
    values
  );

  const { rows } = await query(`${SELECT_PEDIDO} WHERE p.id = $1`, [id]);
  res.json({ pedido: publicPedido(rows[0]) });
});

module.exports = { activos, entregadosHoy, cambiarEstado, cambiarEstadoSchema };
