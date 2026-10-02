-- Medio del movimiento de caja: efectivo o transferencia.
ALTER TABLE movimiento_caja
  ADD COLUMN IF NOT EXISTS medio TEXT CHECK (medio IN ('efectivo', 'transferencia'));
