const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const baseShape = {
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  productoId: z.number().int().positive("Producto inválido"),
  tipoDescuento: z.enum(["porcentaje", "monto"], { message: "Tipo de descuento inválido" }),
  valor: z.number().positive("El valor debe ser mayor a 0"),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inicio inválida"),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha fin inválida"),
};
const createSchema = z.object(baseShape);
const updateSchema = z
  .object({
    nombre: baseShape.nombre.optional(),
    tipoDescuento: baseShape.tipoDescuento.optional(),
    valor: baseShape.valor.optional(),
    fechaInicio: baseShape.fechaInicio.optional(),
    fechaFin: baseShape.fechaFin.optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nada para actualizar" });

const publicPromo = (p) => ({
  id: p.id,
  nombre: p.nombre,
  productoId: p.producto_id,
  productoNombre: p.producto_nombre,
  tipoDescuento: p.tipo_descuento,
  valor: Number(p.valor),
  fechaInicio: p.fecha_inicio,
  fechaFin: p.fecha_fin,
  activo: p.activo,
  vigente: p.vigente,
});

// GET /api/promociones
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT pr.*, p.nombre AS producto_nombre,
            (pr.activo AND CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin) AS vigente
       FROM promocion pr
       JOIN producto p ON p.id = pr.producto_id
      WHERE pr.local_id = $1
      ORDER BY pr.activo DESC, pr.fecha_fin DESC`,
    [req.user.localId]
  );
  res.json({ promociones: rows.map(publicPromo) });
});

const create = asyncHandler(async (req, res) => {
  const { nombre, productoId, tipoDescuento, valor, fechaInicio, fechaFin } = req.body;
  if (tipoDescuento === "porcentaje" && valor > 100) {
    throw new HttpError(400, "El porcentaje no puede ser mayor a 100");
  }
  // Validar producto del local.
  const prod = await query("SELECT id FROM producto WHERE id = $1 AND local_id = $2", [productoId, req.user.localId]);
  if (prod.rows.length === 0) throw new HttpError(400, "El producto no existe en el local");

  const { rows } = await query(
    `INSERT INTO promocion (local_id, nombre, producto_id, tipo_descuento, valor, fecha_inicio, fecha_fin)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.localId, nombre, productoId, tipoDescuento, valor, fechaInicio, fechaFin]
  );
  const full = await query(
    `SELECT pr.*, p.nombre AS producto_nombre,
            (pr.activo AND CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin) AS vigente
       FROM promocion pr JOIN producto p ON p.id = pr.producto_id WHERE pr.id = $1`,
    [rows[0].id]
  );
  res.status(201).json({ promocion: publicPromo(full.rows[0]) });
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const { nombre, tipoDescuento, valor, fechaInicio, fechaFin, activo } = req.body;
  if (tipoDescuento === "porcentaje" && valor != null && valor > 100) {
    throw new HttpError(400, "El porcentaje no puede ser mayor a 100");
  }
  const sets = [];
  const values = [];
  let i = 1;
  const push = (col, val) => { sets.push(`${col} = $${i++}`); values.push(val); };
  if (nombre !== undefined) push("nombre", nombre);
  if (tipoDescuento !== undefined) push("tipo_descuento", tipoDescuento);
  if (valor !== undefined) push("valor", valor);
  if (fechaInicio !== undefined) push("fecha_inicio", fechaInicio);
  if (fechaFin !== undefined) push("fecha_fin", fechaFin);
  if (activo !== undefined) push("activo", activo);
  if (sets.length === 0) throw new HttpError(400, "Nada para actualizar");
  values.push(id, localId);
  const { rows } = await query(
    `UPDATE promocion SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i} RETURNING id`,
    values
  );
  if (rows.length === 0) throw new HttpError(404, "Promoción no encontrada");
  const full = await query(
    `SELECT pr.*, p.nombre AS producto_nombre,
            (pr.activo AND CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin) AS vigente
       FROM promocion pr JOIN producto p ON p.id = pr.producto_id WHERE pr.id = $1`,
    [id]
  );
  res.json({ promocion: publicPromo(full.rows[0]) });
});

// Helper reutilizable: mapa productoId -> promo vigente (para aplicar al vender).
// Usa un client de transacción si se pasa, si no la conexión normal.
async function promosVigentes(runner, localId, productoIds) {
  if (!productoIds.length) return new Map();
  const { rows } = await runner(
    `SELECT DISTINCT ON (producto_id) producto_id, tipo_descuento, valor
       FROM promocion
      WHERE local_id = $1 AND activo = true
        AND producto_id = ANY($2::int[])
        AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
      ORDER BY producto_id, valor DESC`,
    [localId, productoIds]
  );
  const mapa = new Map();
  for (const r of rows) {
    mapa.set(r.producto_id, { tipo: r.tipo_descuento, valor: Number(r.valor) });
  }
  return mapa;
}

module.exports = { list, create, update, createSchema, updateSchema, promosVigentes };
