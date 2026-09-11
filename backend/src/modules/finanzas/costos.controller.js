const { query } = require("../../config/db");
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

module.exports = { costos };
