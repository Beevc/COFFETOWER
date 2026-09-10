const { z } = require("zod");
const { pool, query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

const setRecetaSchema = z.object({
  items: z
    .array(
      z.object({
        insumoId: z.number().int().positive(),
        cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
      })
    )
    .max(50),
});

async function productoDelLocal(id, localId) {
  const { rows } = await query(
    "SELECT id, nombre FROM producto WHERE id = $1 AND local_id = $2",
    [id, localId]
  );
  return rows[0] || null;
}

// GET /api/recetas/:productoId
const getReceta = asyncHandler(async (req, res) => {
  const productoId = Number(req.params.productoId);
  const producto = await productoDelLocal(productoId, req.user.localId);
  if (!producto) throw new HttpError(404, "Producto no encontrado");

  const { rows } = await query(
    `SELECT r.insumo_id AS "insumoId", i.nombre, i.unidad, i.unidad_receta, r.cantidad
       FROM receta_item r
       JOIN insumo i ON i.id = r.insumo_id
      WHERE r.producto_id = $1
      ORDER BY i.nombre`,
    [productoId]
  );
  res.json({
    producto: { id: producto.id, nombre: producto.nombre },
    items: rows.map((r) => ({
      insumoId: r.insumoId,
      nombre: r.nombre,
      unidad: r.unidad,
      unidadReceta: r.unidad_receta || null,
      cantidad: Number(r.cantidad),
    })),
  });
});

// PUT /api/recetas/:productoId  (reemplaza la receta completa)
const setReceta = asyncHandler(async (req, res) => {
  const productoId = Number(req.params.productoId);
  const localId = req.user.localId;
  const { items } = req.body;

  const producto = await productoDelLocal(productoId, localId);
  if (!producto) throw new HttpError(404, "Producto no encontrado");

  // No permitir insumos repetidos.
  const ids = items.map((i) => i.insumoId);
  if (new Set(ids).size !== ids.length) {
    throw new HttpError(400, "Hay insumos repetidos en la receta");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validar que todos los insumos existan y sean del local.
    if (ids.length > 0) {
      const { rows: encontrados } = await client.query(
        "SELECT id FROM insumo WHERE local_id = $1 AND id = ANY($2::int[])",
        [localId, ids]
      );
      if (encontrados.length !== ids.length) {
        throw new HttpError(400, "Algún insumo no existe en el local");
      }
    }

    // Reemplazo total: borrar y volver a insertar.
    await client.query("DELETE FROM receta_item WHERE producto_id = $1", [productoId]);
    for (const it of items) {
      await client.query(
        "INSERT INTO receta_item (producto_id, insumo_id, cantidad) VALUES ($1, $2, $3)",
        [productoId, it.insumoId, it.cantidad]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, total: items.length });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { getReceta, setReceta, setRecetaSchema };
