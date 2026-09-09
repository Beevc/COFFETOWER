const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const createSchema = z.object({
  sku: z.string().trim().min(1, "El SKU es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  precio: z.number().int("El precio debe ser un entero").min(0, "El precio no puede ser negativo"),
  categoria: z.string().trim().min(1).optional(),
});

const updateSchema = z
  .object({
    sku: z.string().trim().min(1, "El SKU es obligatorio").optional(),
    nombre: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    precio: z.number().int("El precio debe ser un entero").min(0, "El precio no puede ser negativo").optional(),
    categoria: z.string().trim().min(1).nullable().optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

const publicProduct = (p) => ({
  id: p.id,
  sku: p.sku,
  nombre: p.nombre,
  precio: p.precio,
  categoria: p.categoria,
  activo: p.activo,
  localId: p.local_id,
  createdAt: p.created_at,
});

async function getProductoDelLocal(id, localId) {
  const { rows } = await query(
    `SELECT id, local_id, sku, nombre, precio, categoria, activo, created_at
       FROM producto WHERE id = $1 AND local_id = $2`,
    [id, localId]
  );
  return rows[0] || null;
}

// GET /api/products?activo=true&q=texto
const list = asyncHandler(async (req, res) => {
  const params = [req.user.localId];
  let sql = `SELECT id, local_id, sku, nombre, precio, categoria, activo, created_at
               FROM producto WHERE local_id = $1`;

  if (req.query.activo === "true" || req.query.activo === "false") {
    params.push(req.query.activo === "true");
    sql += ` AND activo = $${params.length}`;
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    sql += ` AND (nombre ILIKE $${params.length} OR sku ILIKE $${params.length})`;
  }
  sql += " ORDER BY nombre ASC";

  const { rows } = await query(sql, params);
  res.json({ productos: rows.map(publicProduct) });
});

// GET /api/products/:id
const getOne = asyncHandler(async (req, res) => {
  const producto = await getProductoDelLocal(Number(req.params.id), req.user.localId);
  if (!producto) throw new HttpError(404, "Producto no encontrado");
  res.json({ producto: publicProduct(producto) });
});

// POST /api/products
const create = asyncHandler(async (req, res) => {
  const { sku, nombre, precio, categoria } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO producto (local_id, sku, nombre, precio, categoria)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, local_id, sku, nombre, precio, categoria, activo, created_at`,
      [req.user.localId, sku, nombre, precio, categoria ?? null]
    );
    res.status(201).json({ producto: publicProduct(rows[0]) });
  } catch (err) {
    if (err.code === "23505") {
      throw new HttpError(409, "Ya existe un producto con ese SKU en el local");
    }
    throw err;
  }
});

// PATCH /api/products/:id
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localId = req.user.localId;
  const actual = await getProductoDelLocal(id, localId);
  if (!actual) throw new HttpError(404, "Producto no encontrado");

  const { sku, nombre, precio, categoria, activo } = req.body;
  const sets = [];
  const values = [];
  let i = 1;
  if (sku !== undefined) { sets.push(`sku = $${i++}`); values.push(sku); }
  if (nombre !== undefined) { sets.push(`nombre = $${i++}`); values.push(nombre); }
  if (precio !== undefined) { sets.push(`precio = $${i++}`); values.push(precio); }
  if (categoria !== undefined) { sets.push(`categoria = $${i++}`); values.push(categoria); }
  if (activo !== undefined) { sets.push(`activo = $${i++}`); values.push(activo); }
  sets.push(`updated_at = now()`);

  values.push(id, localId);
  try {
    const { rows } = await query(
      `UPDATE producto SET ${sets.join(", ")}
        WHERE id = $${i++} AND local_id = $${i}
        RETURNING id, local_id, sku, nombre, precio, categoria, activo, created_at`,
      values
    );
    res.json({ producto: publicProduct(rows[0]) });
  } catch (err) {
    if (err.code === "23505") {
      throw new HttpError(409, "Ya existe un producto con ese SKU en el local");
    }
    throw err;
  }
});

module.exports = { list, getOne, create, update, createSchema, updateSchema };
