-- ============================================================
-- Conteo de inventario (semanal): se anota el stock físico real de cada insumo.
-- El sistema registra la diferencia vs el teórico y ajusta el stock a lo contado
-- (con un movimiento de tipo 'ajuste'). Solo admin.
-- ============================================================
CREATE TABLE IF NOT EXISTS inventario_conteo (
  id          SERIAL PRIMARY KEY,
  local_id    INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  usuario_id  INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  nota        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conteo_local ON inventario_conteo(local_id);

CREATE TABLE IF NOT EXISTS inventario_conteo_item (
  id            SERIAL PRIMARY KEY,
  conteo_id     INTEGER NOT NULL REFERENCES inventario_conteo(id) ON DELETE CASCADE,
  insumo_id     INTEGER NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
  stock_sistema NUMERIC(12,3) NOT NULL,   -- teórico al momento del conteo
  stock_contado NUMERIC(12,3) NOT NULL,   -- físico contado
  diferencia    NUMERIC(12,3) NOT NULL    -- contado - sistema
);
CREATE INDEX IF NOT EXISTS idx_conteo_item_conteo ON inventario_conteo_item(conteo_id);
