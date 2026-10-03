-- Cierre de caja por cada medio de pago (para cuadrar todo).
ALTER TABLE caja_turno
  ADD COLUMN IF NOT EXISTS debito_esperado        INTEGER,
  ADD COLUMN IF NOT EXISTS debito_contado         INTEGER,
  ADD COLUMN IF NOT EXISTS credito_esperado       INTEGER,
  ADD COLUMN IF NOT EXISTS credito_contado        INTEGER,
  ADD COLUMN IF NOT EXISTS transferencia_esperado INTEGER,
  ADD COLUMN IF NOT EXISTS transferencia_contado  INTEGER;
