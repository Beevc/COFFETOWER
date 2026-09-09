-- ============================================================
-- Fase 4 — Estadísticas y fidelidad
-- Entidades: cliente, fidelidad_config, canje, promocion
-- + columnas nuevas en venta (cliente, promoción, convenio, descuento)
-- (Estadísticas no requiere tablas: se calcula sobre venta/venta_item)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_descuento') THEN
    CREATE TYPE tipo_descuento AS ENUM ('porcentaje', 'monto');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'beneficio_fidelidad') THEN
    CREATE TYPE beneficio_fidelidad AS ENUM ('gratis', 'porcentaje');
  END IF;
END$$;

-- ------------------------------------------------------------
-- CLIENTE — tarjeta de fidelidad (identificado por teléfono o nombre)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente (
  id                SERIAL PRIMARY KEY,
  local_id          INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  nombre            TEXT NOT NULL,
  telefono          TEXT,
  compras_contador  INTEGER NOT NULL DEFAULT 0,
  activo            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cliente_local ON cliente(local_id);
-- Teléfono único por local (cuando se indica).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_tel_local
  ON cliente(local_id, telefono) WHERE telefono IS NOT NULL AND telefono <> '';

-- ------------------------------------------------------------
-- FIDELIDAD_CONFIG — un programa por local (umbral + beneficio)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fidelidad_config (
  id              SERIAL PRIMARY KEY,
  local_id        INTEGER NOT NULL UNIQUE REFERENCES local(id) ON DELETE RESTRICT,
  activo          BOOLEAN NOT NULL DEFAULT false,
  umbral          INTEGER NOT NULL DEFAULT 5 CHECK (umbral > 0),
  tipo_beneficio  beneficio_fidelidad NOT NULL DEFAULT 'gratis',
  valor           NUMERIC(6,2) NOT NULL DEFAULT 100,  -- % cuando es 'porcentaje'
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- CANJE — historial de beneficios usados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canje (
  id           SERIAL PRIMARY KEY,
  local_id     INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  cliente_id   INTEGER NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
  venta_id     INTEGER REFERENCES venta(id) ON DELETE SET NULL,
  beneficio    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canje_cliente ON canje(cliente_id);

-- ------------------------------------------------------------
-- PROMOCION — descuento por producto con fecha de vigencia
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promocion (
  id             SERIAL PRIMARY KEY,
  local_id       INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  nombre         TEXT NOT NULL,
  producto_id    INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  tipo_descuento tipo_descuento NOT NULL,
  valor          NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE NOT NULL,
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_promocion_local ON promocion(local_id);
CREATE INDEX IF NOT EXISTS idx_promocion_producto ON promocion(producto_id);

-- ------------------------------------------------------------
-- VENTA — columnas nuevas
-- ------------------------------------------------------------
ALTER TABLE venta ADD COLUMN IF NOT EXISTS cliente_id   INTEGER REFERENCES cliente(id) ON DELETE SET NULL;
ALTER TABLE venta ADD COLUMN IF NOT EXISTS descuento    INTEGER NOT NULL DEFAULT 0 CHECK (descuento >= 0);
ALTER TABLE venta ADD COLUMN IF NOT EXISTS es_convenio  BOOLEAN NOT NULL DEFAULT false;

-- Para el convenio (frappé regalado) no hay caja ni medio de pago.
ALTER TABLE venta ALTER COLUMN caja_turno_id DROP NOT NULL;
ALTER TABLE venta ALTER COLUMN medio_pago DROP NOT NULL;

-- Coherencia: una venta normal exige turno y medio de pago; el convenio no.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_venta_convenio') THEN
    ALTER TABLE venta ADD CONSTRAINT chk_venta_convenio CHECK (
      es_convenio = true
      OR (caja_turno_id IS NOT NULL AND medio_pago IS NOT NULL)
    );
  END IF;
END$$;
