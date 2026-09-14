const { query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");

// GET /api/finanzas/costos
// Para cada producto activo: costo de su receta, ganancia y margen.
// Costo = Σ (cantidad_receta × factor_receta × costo_unitario_insumo).
const costos = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.nombre, p.precio,
            COALESCE(ROUND(SUM(ri.cantidad * i.factor_receta * i.costo_unitario)), 0) AS costo,
            COUNT(ri.id) AS n_items,
            COUNT(ri.id) FILTER (WHERE i.costo_unitario > 0) AS n_con_costo
       FROM producto p
       LEFT JOIN receta_item ri ON ri.producto_id = p.id
       LEFT JOIN insumo i ON i.id = ri.insumo_id
      WHERE p.local_id = $1 AND p.activo = true
      GROUP BY p.id, p.nombre, p.precio
      ORDER BY p.nombre ASC`,
    [req.user.localId]
  );

  const productos = rows.map((r) => {
    const precio = Number(r.precio);
    const costo = Number(r.costo);
    const nItems = Number(r.n_items);
    const nConCosto = Number(r.n_con_costo);
    const ganancia = precio - costo;
    return {
      id: r.id,
      nombre: r.nombre,
      precio,
      costo,
      ganancia,
      margen: precio > 0 ? Math.round((ganancia / precio) * 100) : 0,
      tieneReceta: nItems > 0,
      // La receta tiene insumos sin costo cargado -> el costo está incompleto.
      costoIncompleto: nItems > 0 && nConCosto < nItems,
    };
  });
  res.json({ productos });
});

// GET /api/finanzas/costos/:productoId  -> desglose por insumo de la receta
const costoDetalle = asyncHandler(async (req, res) => {
  const id = Number(req.params.productoId);
  const localId = req.user.localId;
  const prod = await query("SELECT id, nombre, precio FROM producto WHERE id = $1 AND local_id = $2", [id, localId]);
  if (!prod.rows[0]) throw new HttpError(404, "Producto no encontrado");

  const { rows } = await query(
    `SELECT i.id AS "insumoId", i.nombre, i.unidad, i.unidad_receta AS "unidadReceta",
            i.factor_receta AS "factorReceta", i.costo_unitario AS "costoUnitario", ri.cantidad
       FROM receta_item ri JOIN insumo i ON i.id = ri.insumo_id
      WHERE ri.producto_id = $1
      ORDER BY i.nombre`,
    [id]
  );

  const items = rows.map((r) => {
    const cantidad = Number(r.cantidad);
    const factor = Number(r.factorReceta);
    const costoU = Number(r.costoUnitario);
    const baseCantidad = cantidad * factor; // en la unidad real del insumo
    return {
      insumoId: r.insumoId,
      nombre: r.nombre,
      unidad: r.unidad,
      unidadReceta: r.unidadReceta || null,
      cantidad,
      factorReceta: factor,
      costoUnitario: costoU,
      baseCantidad,
      subtotal: Math.round(baseCantidad * costoU),
      sinCosto: costoU === 0,
    };
  });

  const precio = Number(prod.rows[0].precio);
  const costo = items.reduce((s, x) => s + x.subtotal, 0);
  res.json({
    producto: { id: prod.rows[0].id, nombre: prod.rows[0].nombre, precio },
    items,
    costo,
    ganancia: precio - costo,
    margen: precio > 0 ? Math.round(((precio - costo) / precio) * 100) : 0,
  });
});

module.exports = { costos, costoDetalle };
