-- ============================================================
-- Fase 2 — Ventas y caja
-- Entidades: caja_turno, venta, venta_item
-- ============================================================

-- ENUMs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'caja_estado') THEN
    CREATE TYPE caja_estado AS ENUM ('abierta', 'cerrada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medio_pago') THEN
    CREATE TYPE medio_pago AS ENUM ('efectivo', 'debito', 'credito', 'transferencia');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venta_estado') THEN
    CREATE TYPE venta_estado AS ENUM ('activa', 'anulada');
  END IF;
END$$;

-- ------------------------------------------------------------
-- CAJA_TURNO — cada apertura/cierre de caja
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caja_turno (
  id                 SERIAL PRIMARY KEY,
  local_id           INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  cajero_id          INTEGER NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  estado             caja_estado NOT NULL DEFAULT 'abierta',
  monto_inicial      INTEGER NOT NULL CHECK (monto_inicial >= 0),
  abierta_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en         TIMESTAMPTZ,
  cerrado_por_id     INTEGER REFERENCES usuario(id) ON DELETE RESTRICT,
  efectivo_esperado  INTEGER,   -- monto_inicial + ventas en efectivo (se calcula al cerrar)
  efectivo_contado   INTEGER,   -- lo contado físicamente al cerrar
  diferencia         INTEGER    -- contado - esperado
);

CREATE INDEX IF NOT EXISTS idx_caja_local ON caja_turno(local_id);

-- Solo puede haber UNA caja abierta por local a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_caja_abierta_por_local
  ON caja_turno(local_id) WHERE estado = 'abierta';

-- ------------------------------------------------------------
-- VENTA — cada venta registrada dentro de un turno
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta (
  id                 SERIAL PRIMARY KEY,
  local_id           INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  caja_turno_id      INTEGER NOT NULL REFERENCES caja_turno(id) ON DELETE RESTRICT,
  cajero_id          INTEGER NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  numero             INTEGER NOT NULL,           -- correlativo interno por local
  total              INTEGER NOT NULL CHECK (total >= 0),
  medio_pago         medio_pago NOT NULL,
  estado             venta_estado NOT NULL DEFAULT 'activa',
  anulada_en         TIMESTAMPTZ,
  anulada_por_id     INTEGER REFERENCES usuario(id) ON DELETE RESTRICT,
  motivo_anulacion   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_venta_numero_local UNIQUE (local_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_venta_turno ON venta(caja_turno_id);
CREATE INDEX IF NOT EXISTS idx_venta_local ON venta(local_id);

-- ------------------------------------------------------------
-- VENTA_ITEM — detalle de la venta (snapshot de nombre y precio)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta_item (
  id            SERIAL PRIMARY KEY,
  venta_id      INTEGER NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
  producto_id   INTEGER NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
  nombre        TEXT NOT NULL,                    -- snapshot
  precio_unit   INTEGER NOT NULL CHECK (precio_unit >= 0),  -- snapshot
  cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
  subtotal      INTEGER NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_venta_item_venta ON venta_item(venta_id);
