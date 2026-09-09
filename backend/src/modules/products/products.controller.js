const { z } = require("zod");
const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const createSchema = z.object({
  sku: z.string().trim().min(1, "El SKU es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  precio: z.number().int("El precio debe ser un entero").min(0, "El precio no puede ser negativo"),
  categoriaId: z.number().int().positive().nullable().optional(),
});

const updateSchema = z
  .object({
    sku: z.string().trim().min(1, "El SKU es obligatorio").optional(),
    nombre: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    precio: z.number().int("El precio debe ser un entero").min(0, "El precio no puede ser negativo").optional(),
    categoriaId: z.number().int().positive().nullable().optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

// SELECT del producto con su categoría y hasta 2 ancestros, para armar la ruta.
// cc = categoría del producto (el nivel más específico); cp = padre; cpp = abuelo.
const SELECT_PRODUCTO = `
  SELECT p.id, p.local_id, p.sku, p.nombre, p.precio, p.activo, p.created_at,
         p.categoria_id,
         cc.nivel AS cat_nivel, cc.nombre AS cat_n1, cp.nombre AS cat_n2, cpp.nombre AS cat_n3
    FROM producto p
    LEFT JOIN categoria_producto cc  ON cc.id = p.categoria_id
    LEFT JOIN categoria_producto cp  ON cp.id = cc.parent_id
    LEFT JOIN categoria_producto cpp ON cpp.id = cp.parent_id`;

// A partir del nivel del nodo elegido, reparte los nombres en los 3 campos.
function categoriaCampos(p) {
  let categoria = null, subcategoria = null, subsubcategoria = null;
  if (p.cat_nivel === 1) { categoria = p.cat_n1; }
  else if (p.cat_nivel === 2) { subcategoria = p.cat_n1; categoria = p.cat_n2; }
  else if (p.cat_nivel === 3) { subsubcategoria = p.cat_n1; subcategoria = p.cat_n2; categoria = p.cat_n3; }
  return {
    categoria,
    subcategoria,
    subsubcategoria,
    categoriaPath: [categoria, subcategoria, subsubcategoria].filter(Boolean),
  };
}

const publicProduct = (p) => ({
  id: p.id,
  sku: p.sku,
  nombre: p.nombre,
  precio: p.precio,
  categoriaId: p.categoria_id,
  ...categoriaCampos(p),
  activo: p.activo,
  localId: p.local_id,
  createdAt: p.created_at,
});

async function getProductoDelLocal(id, localId) {
  const { rows } = await query(
    `${SELECT_PRODUCTO} WHERE p.id = $1 AND p.local_id = $2`,
    [id, localId]
  );
  return rows[0] || null;
}

// Valida que la categoría (si se envía) exista y sea del local. Devuelve el id o null.
async function validarCategoria(categoriaId, localId) {
  if (categoriaId == null) return null;
  const { rows } = await query(
    "SELECT id FROM categoria_producto WHERE id = $1 AND local_id = $2",
    [categoriaId, localId]
  );
  if (!rows[0]) throw new HttpError(400, "La categoría no existe en el local");
  return categoriaId;
}

// GET /api/products?activo=true&q=texto
const list = asyncHandler(async (req, res) => {
  const params = [req.user.localId];
  let sql = `${SELECT_PRODUCTO} WHERE p.local_id = $1`;

  if (req.query.activo === "true" || req.query.activo === "false") {
    params.push(req.query.activo === "true");
    sql += ` AND p.activo = $${params.length}`;
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    sql += ` AND (p.nombre ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
  }
  sql += " ORDER BY p.nombre ASC";

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
  const { sku, nombre, precio, categoriaId } = req.body;
  const localId = req.user.localId;
  const catId = await validarCategoria(categoriaId, localId);
  try {
    const { rows } = await query(
      `INSERT INTO producto (local_id, sku, nombre, precio, categoria_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [localId, sku, nombre, precio, catId]
    );
    const producto = await getProductoDelLocal(rows[0].id, localId);
    res.status(201).json({ producto: publicProduct(producto) });
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

  const { sku, nombre, precio, categoriaId, activo } = req.body;
  if (categoriaId !== undefined) await validarCategoria(categoriaId, localId);
  const sets = [];
  const values = [];
  let i = 1;
  if (sku !== undefined) { sets.push(`sku = $${i++}`); values.push(sku); }
  if (nombre !== undefined) { sets.push(`nombre = $${i++}`); values.push(nombre); }
  if (precio !== undefined) { sets.push(`precio = $${i++}`); values.push(precio); }
  if (categoriaId !== undefined) { sets.push(`categoria_id = $${i++}`); values.push(categoriaId); }
  if (activo !== undefined) { sets.push(`activo = $${i++}`); values.push(activo); }
  sets.push(`updated_at = now()`);

  values.push(id, localId);
  try {
    await query(
      `UPDATE producto SET ${sets.join(", ")} WHERE id = $${i++} AND local_id = $${i}`,
      values
    );
    const producto = await getProductoDelLocal(id, localId);
    res.json({ producto: publicProduct(producto) });
  } catch (err) {
    if (err.code === "23505") {
      throw new HttpError(409, "Ya existe un producto con ese SKU en el local");
    }
    throw err;
  }
});

module.exports = { list, getOne, create, update, createSchema, updateSchema };
