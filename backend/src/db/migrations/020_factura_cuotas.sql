-- ============================================================
-- Cuotas de una factura: plan de pagos programados con
-- vencimiento por cuota. El pago de una cuota se registra en la
-- tabla pago (enlazada con cuota_id), de modo que el saldo y el
-- estado de la factura se siguen calculando desde los pagos.
-- ============================================================

CREATE TABLE IF NOT EXISTS cuota (
  id                 SERIAL PRIMARY KEY,
  local_id           INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  factura_id         INTEGER NOT NULL REFERENCES factura(id) ON DELETE CASCADE,
  numero             INTEGER NOT NULL,                 -- 1, 2, 3...
  monto              INTEGER NOT NULL CHECK (monto >= 0),
  fecha_vencimiento  DATE NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cuota_factura_numero UNIQUE (factura_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_cuota_factura ON cuota(factura_id);
CREATE INDEX IF NOT EXISTS idx_cuota_venc ON cuota(fecha_vencimiento);

-- Un pago puede quedar asociado a una cuota específica (opcional:
-- los abonos libres siguen teniendo cuota_id NULL).
ALTER TABLE pago
  ADD COLUMN IF NOT EXISTS cuota_id INTEGER REFERENCES cuota(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pago_cuota ON pago(cuota_id);
