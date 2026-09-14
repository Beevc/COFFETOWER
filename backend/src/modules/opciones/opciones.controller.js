const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const createSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  tipo: z.enum(["extra", "sustitucion"], { message: "Tipo inválido" }),
  precio: z.number().int().min(0).optional(),
  insumoId: z.number().int().positive().nullable().optional(),
  cantidad: z.number().positive().nullable().optional(),
  insumoOrigenId: z.number().int().positive().nullable().optional(),
  insumoReemplazoId: z.number().int().positive().nullable().optional(),
});
const updateSchema = createSchema.partial().extend({ activo: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: "Nada para actualizar" });

const publicOpcion = (o) => ({
  id: o.id,
  nombre: o.nombre,
  tipo: o.tipo,
  precio: Number(o.precio),
  insumoId: o.insumo_id,
  insumoNombre: o.insumo_nombre || null,
  cantidad: o.cantidad != null ? Number(o.cantidad) : null,
  insumoOrigenId: o.insumo_origen_id,
  origenNombre: o.origen_nombre || null,
  insumoReemplazoId: o.insumo_reemplazo_id,
  reemplazoNombre: o.reemplazo_nombre || null,
  activo: o.activo,
});

const SELECT_OPCION = `
  SELECT o.*, i.nombre AS insumo_nombre, io.nombre AS origen_nombre, ir.nombre AS reemplazo_nombre
    FROM opcion o
    LEFT JOIN insumo i  ON i.id  = o.insumo_id
    LEFT JOIN insumo io ON io.id = o.insumo_origen_id
    LEFT JOIN insumo ir ON ir.id = o.insumo_reemplazo_id`;

async function insumoDelLocal(id, localId) {
  if (id == null) return true;
  const { rows } = await query("SELECT id FROM insumo WHERE id = $1 AND local_id = $2", [id, localId]);
  return rows.length > 0;
}

// Valida coherencia según el tipo y que los insumos sean del local.
async function validar(body, localId) {
  const { tipo, insumoId, cantidad, insumoOrigenId, insumoReemplazoId } = body;
  if (tipo === "extra") {
    if (!insumoId || !(cantidad > 0)) throw new HttpError(400, "El extra requiere un insumo y su cantidad");
    if (!(await insumoDelLocal(insumoId, localId))) throw new HttpError(400, "El insumo del extra no es del local");
  } else if (tipo === "sustitucion") {
    if (!insumoOrigenId || !insumoReemplazoId) throw new HttpError(400, "La sustitución requiere insumo a reemplazar y su reemplazo");
    if (insumoOrigenId === insumoReemplazoId) throw new HttpError(400, "El insumo origen y reemplazo deben ser distintos");
    if (!(await insumoDelLocal(insumoOrigenId, localId)) || !(await insumoDelLocal(insumoReemplazoId, localId)))
      throw new HttpError(400, "Algún insumo de la sustitución no es del local");
  }
}

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT_OPCION} WHERE o.local_id = $1 ORDER BY o.tipo, o.nombre`, [req.user.localId]);
  res.json({ opciones: rows.map(publicOpcion) });
});

const create = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  await validar(req.body, localId);
  const { nombre, tipo, precio = 0, insumoId, cantidad, insumoOrigenId, insumoReemplazoId } = req.body;
  const { rows } = await query(
    `INSERT INTO opcion (local_id, nombre, tipo, precio, insumo_id, cantidad, insumo_origen_id, insumo_reemplazo_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [localId, nombre, tipo, precio,
     tipo === "extra" ? insumoId : null, tipo === "extra" ? cantidad : null,
     tipo === "sustitucion" ? insumoOrigenId : null, tipo === "sustitucion" ? insumoReemplazoId : null]
  );
  const { rows: full } = await query(`${SELECT_OPCION} WHERE o.id = $1`, [rows[0].id]);
  res.status(201).json({ opcion: publicOpcion(full[0]) });
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const { rows: cur } = await query("SELECT * FROM opcion WHERE id=$1 AND local_id=$2", [id, localId]);
  if (!cur[0]) throw new HttpError(404, "Opción no encontrada");

  // Validar con los valores combinados (actual + cambios).
  const merged = {
    tipo: req.body.tipo ?? cur[0].tipo,
    precio: req.body.precio,
    insumoId: req.body.insumoId ?? cur[0].insumo_id,
    cantidad: req.body.cantidad ?? (cur[0].cantidad != null ? Number(cur[0].cantidad) : null),
    insumoOrigenId: req.body.insumoOrigenId ?? cur[0].insumo_origen_id,
    insumoReemplazoId: req.body.insumoReemplazoId ?? cur[0].insumo_reemplazo_id,
  };
  await validar(merged, localId);

  const map = {
    nombre: "nombre", tipo: "tipo", precio: "precio", insumoId: "insumo_id",
    cantidad: "cantidad", insumoOrigenId: "insumo_origen_id", insumoReemplazoId: "insumo_reemplazo_id", activo: "activo",
  };
  const sets = [];
  const values = [];
  let i = 1;
  for (const [k, col] of Object.entries(map)) {
    if (req.body[k] !== undefined) { sets.push(`${col} = $${i++}`); values.push(req.body[k]); }
  }
  values.push(id, localId);
  await query(`UPDATE opcion SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i}`, values);
  const { rows: full } = await query(`${SELECT_OPCION} WHERE o.id = $1`, [id]);
  res.json({ opcion: publicOpcion(full[0]) });
});

const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query("DELETE FROM opcion WHERE id=$1 AND local_id=$2", [Number(req.params.id), req.user.localId]);
  if (rowCount === 0) throw new HttpError(404, "Opción no encontrada");
  res.json({ ok: true });
});

module.exports = { list, create, update, remove, createSchema, updateSchema };
