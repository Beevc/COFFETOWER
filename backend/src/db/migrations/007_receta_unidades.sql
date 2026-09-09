-- ============================================================
-- Unidad de receta por insumo (conversión a la unidad real)
-- Ej: Leche en ml con unidad_receta='pams', factor_receta=10  -> 1 pam = 10 ml
--     Café en g  con unidad_receta='cucharada', factor_receta=5 -> 1 cda = 5 g
-- El stock/inventario sigue en la unidad real; la receta se escribe en
-- unidad_receta y al vender se multiplica por factor_receta para descontar.
-- unidad_receta NULL => la receta usa la unidad real (comportamiento original).
-- ============================================================
ALTER TABLE insumo
  ADD COLUMN IF NOT EXISTS unidad_receta TEXT,
  ADD COLUMN IF NOT EXISTS factor_receta NUMERIC(12,4) NOT NULL DEFAULT 1
    CHECK (factor_receta > 0);
