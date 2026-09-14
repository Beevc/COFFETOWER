-- ============================================================
-- Promoción tipo "pack" (Nx precio): N unidades del mismo producto por un
-- precio fijo (ej. 2 x $7.000). pack_cantidad = N, pack_precio = precio del pack.
-- ============================================================
ALTER TYPE tipo_descuento ADD VALUE IF NOT EXISTS 'pack';

ALTER TABLE promocion
  ADD COLUMN IF NOT EXISTS pack_cantidad INTEGER,
  ADD COLUMN IF NOT EXISTS pack_precio   INTEGER;
