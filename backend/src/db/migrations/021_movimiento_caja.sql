-- ============================================================
-- Movimientos de caja manuales (solo admin, en Finanzas):
-- ingresos (aportes, otros ingresos) y retiros (sacar efectivo).
-- Se usan para el saldo anterior y el saldo actual del resumen.
-- ============================================================

CREATE TABLE IF NOT EXISTS movimiento_caja (
  id            SERIAL PRIMARY KEY,
  local_id      INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  tipo          TEXT NOT NULL CHECK (tipo IN ('ingreso', 'retiro')),
  monto         INTEGER NOT NULL CHECK (monto > 0),
  fecha         DATE NOT NULL,
  descripcion   TEXT,
  creado_por_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movcaja_local ON movimiento_caja(local_id);
CREATE INDEX IF NOT EXISTS idx_movcaja_fecha ON movimiento_caja(fecha);
