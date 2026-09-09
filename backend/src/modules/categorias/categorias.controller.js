const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const createSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  parentId: z.number().int().positive().nullable().optional(),
});

const updateSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

const publicCategoria = (c) => ({
  id: c.id,
  parentId: c.parent_id,
  nivel: c.nivel,
  nombre: c.nombre,
  activo: c.activo,
});

async function getCategoriaDelLocal(id, localId) {
  const { rows } = await query(
    "SELECT * FROM categoria_producto WHERE id = $1 AND local_id = $2",
    [id, localId]
  );
  return rows[0] || null;
}

// GET /api/categorias  -> lista plana (el frontend arma el árbol con parent_id)
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    "SELECT * FROM categoria_producto WHERE local_id = $1 ORDER BY nivel, nombre",
    [req.user.localId]
  );
  res.json({ categorias: rows.map(publicCategoria) });
});

// POST /api/categorias  -> el nivel se deduce del padre (nivel padre + 1; sin padre = 1)
const create = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const { nombre, parentId = null } = req.body;

  let nivel = 1;
  if (parentId) {
    const padre = await getCategoriaDelLocal(parentId, localId);
    if (!padre) throw new HttpError(400, "La categoría padre no existe");
    if (padre.nivel >= 3) throw new HttpError(400, "No se pueden crear más de 3 niveles");
    nivel = padre.nivel + 1;
  }

  try {
    const { rows } = await query(
      `INSERT INTO categoria_producto (local_id, parent_id, nivel, nombre)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [localId, parentId, nivel, nombre]
    );
    res.status(201).json({ categoria: publicCategoria(rows[0]) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe una categoría con ese nombre en ese nivel");
    throw err;
  }
});

// PATCH /api/categorias/:id
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const actual = await getCategoriaDelLocal(id, localId);
  if (!actual) throw new HttpError(404, "Categoría no encontrada");

  const { nombre, activo } = req.body;
  const sets = [];
  const values = [];
  let i = 1;
  if (nombre !== undefined) { sets.push(`nombre = $${i++}`); values.push(nombre); }
  if (activo !== undefined) { sets.push(`activo = $${i++}`); values.push(activo); }
  sets.push("updated_at = now()");
  values.push(id, localId);
  try {
    const { rows } = await query(
      `UPDATE categoria_producto SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i} RETURNING *`,
      values
    );
    res.json({ categoria: publicCategoria(rows[0]) });
  } catch (err) {
    if (err.code === "23505") throw new HttpError(409, "Ya existe una categoría con ese nombre en ese nivel");
    throw err;
  }
});

// DELETE /api/categorias/:id  -> borra la categoría y sus subcategorías (cascada).
// Los productos que la usaban quedan sin categoría (FK ON DELETE SET NULL).
const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const actual = await getCategoriaDelLocal(id, localId);
  if (!actual) throw new HttpError(404, "Categoría no encontrada");
  await query("DELETE FROM categoria_producto WHERE id = $1 AND local_id = $2", [id, localId]);
  res.json({ ok: true });
});

module.exports = { list, create, update, remove, createSchema, updateSchema };
