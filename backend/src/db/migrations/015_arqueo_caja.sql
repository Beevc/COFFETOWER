-- ============================================================
-- Arqueo de caja ("mini cierre"): el cajero cuenta el efectivo durante el
-- turno SIN cerrarlo. Puede haber varios por turno. El cierre final lo hace
-- el admin (caja_turno).
-- ============================================================
CREATE TABLE IF NOT EXISTS arqueo_caja (
  id                 SERIAL PRIMARY KEY,
  local_id           INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  caja_turno_id      INTEGER NOT NULL REFERENCES caja_turno(id) ON DELETE CASCADE,
  usuario_id         INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  efectivo_esperado  INTEGER NOT NULL,   -- monto_inicial + ventas en efectivo al momento
  efectivo_contado   INTEGER NOT NULL,
  diferencia         INTEGER NOT NULL,   -- contado - esperado
  nota               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arqueo_turno ON arqueo_caja(caja_turno_id);
