const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const createSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  contacto: z.string().trim().max(120).optional(),
});

const updateSchema = z
  .object({
    nombre: z.string().trim().min(1).optional(),
    contacto: z.string().trim().max(120).nullable().optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nada para actualizar" });

const publicProveedor = (p) => ({
  id: p.id,
  nombre: p.nombre,
  contacto: p.contacto,
  activo: p.activo,
  deuda: p.deuda != null ? Number(p.deuda) : 0, // saldo pendiente con este proveedor
});

// GET /api/finanzas/proveedores?activo=true
const list = asyncHandler(async (req, res) => {
  const params = [req.user.localId];
  let sql = `
    SELECT pr.*,
      COALESCE((SELECT SUM(f.monto_total) FROM factura f WHERE f.proveedor_id = pr.id), 0)
      - COALESCE((SELECT SUM(pg.monto) FROM pago pg JOIN factura f2 ON f2.id = pg.factura_id
                   WHERE f2.proveedor_id = pr.id), 0) AS deuda
      FROM proveedor pr
     WHERE pr.local_id = $1`;
  if (req.query.activo === "true" || req.query.activo === "false") {
    params.push(req.query.activo === "true");
    sql += ` AND pr.activo = $${params.length}`;
  }
  sql += " ORDER BY pr.nombre ASC";
  const { rows } = await query(sql, params);
  res.json({ proveedores: rows.map(publicProveedor) });
});

// POST /api/finanzas/proveedores
const create = asyncHandler(async (req, res) => {
  const { nombre, contacto } = req.body;
  try {
    const { rows } = await query(
      "INSERT INTO proveedor (local_id, nombre, contacto) VALUES ($1,$2,$3) RETURNING *",
      [req.user.localId, nombre, contacto || null]
    );
    res.status(201).json({ proveedor: publicProveedor(rows[0]) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un proveedor con ese nombre");
    throw err;
  }
});

// PATCH /api/finanzas/proveedores/:id
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const { nombre, contacto, activo } = req.body;
  const sets = [];
  const values = [];
  let i = 1;
  if (nombre !== undefined) { sets.push(`nombre = $${i++}`); values.push(nombre); }
  if (contacto !== undefined) { sets.push(`contacto = $${i++}`); values.push(contacto || null); }
  if (activo !== undefined) { sets.push(`activo = $${i++}`); values.push(activo); }
  sets.push("updated_at = now()");
  values.push(id, localId);
  try {
    const { rows } = await query(
      `UPDATE proveedor SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i} RETURNING *`,
      values
    );
    if (rows.length === 0) throw new HttpError(404, "Proveedor no encontrado");
    res.json({ proveedor: publicProveedor(rows[0]) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe un proveedor con ese nombre");
    throw err;
  }
});

module.exports = { list, create, update, createSchema, updateSchema };
