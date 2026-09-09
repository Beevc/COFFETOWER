-- ============================================================
-- Fase 5 — Barista y cierre
-- Entidad: pedido (se genera al registrar una venta)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pedido_estado') THEN
    CREATE TYPE pedido_estado AS ENUM ('pendiente', 'preparado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pedido_momento') THEN
    CREATE TYPE pedido_momento AS ENUM ('al_momento', 'despues', 'programado');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS pedido (
  id                SERIAL PRIMARY KEY,
  local_id          INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  venta_id          INTEGER NOT NULL UNIQUE REFERENCES venta(id) ON DELETE CASCADE,
  estado            pedido_estado NOT NULL DEFAULT 'pendiente',
  momento           pedido_momento NOT NULL DEFAULT 'al_momento',
  hora_programada   TIME,                 -- solo si momento = 'programado'
  preparado_por_id  INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  preparado_en      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_local_estado ON pedido(local_id, estado);
