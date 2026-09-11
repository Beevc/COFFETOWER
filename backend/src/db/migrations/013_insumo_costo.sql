-- ============================================================
-- Costo por unidad del insumo (en su unidad real: $/ml, $/g, $/unidad).
-- Sirve para calcular cuánto cuesta hacer cada receta y la ganancia por frappé.
-- ============================================================
ALTER TABLE insumo
  ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(12,4) NOT NULL DEFAULT 0
    CHECK (costo_unitario >= 0);
