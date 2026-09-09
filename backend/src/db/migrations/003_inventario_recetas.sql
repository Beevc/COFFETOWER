-- ============================================================
-- Fase 3 — Inventario y recetas
-- Entidades: insumo, receta_item, movimiento_inventario
-- ============================================================

-- ENUMs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unidad_insumo') THEN
    CREATE TYPE unidad_insumo AS ENUM ('ml', 'l', 'g', 'kg', 'unidad');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
    CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'consumo', 'merma', 'ajuste');
  END IF;
END$$;

-- ------------------------------------------------------------
-- INSUMO — cada ingrediente con su stock y umbral de alerta.
-- El stock puede quedar negativo (permitimos vender igual).
-- Cantidades con decimales: NUMERIC(12,3).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insumo (
  id             SERIAL PRIMARY KEY,
  local_id       INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  nombre         TEXT NOT NULL,
  unidad         unidad_insumo NOT NULL,
  stock_actual   NUMERIC(12,3) NOT NULL DEFAULT 0,
  umbral_alerta  NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (umbral_alerta >= 0),
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_insumo_nombre_local UNIQUE (local_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_insumo_local ON insumo(local_id);

-- ------------------------------------------------------------
-- RECETA_ITEM — insumos que componen un producto, con su cantidad.
-- La cantidad está en la misma unidad del insumo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receta_item (
  id           SERIAL PRIMARY KEY,
  producto_id  INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  insumo_id    INTEGER NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
  cantidad     NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  CONSTRAINT uq_receta_producto_insumo UNIQUE (producto_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_receta_producto ON receta_item(producto_id);

-- ------------------------------------------------------------
-- MOVIMIENTO_INVENTARIO — historial de cambios de stock.
-- 'cantidad' es el delta aplicado al stock (positivo suma, negativo resta):
--   ingreso  -> positivo
--   consumo  -> negativo (venta)
--   merma    -> negativo
--   ajuste   -> positivo o negativo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id           SERIAL PRIMARY KEY,
  local_id     INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  insumo_id    INTEGER NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
  tipo         tipo_movimiento NOT NULL,
  cantidad     NUMERIC(12,3) NOT NULL,
  venta_id     INTEGER REFERENCES venta(id) ON DELETE SET NULL,
  usuario_id   INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  motivo       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movim_insumo ON movimiento_inventario(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movim_venta ON movimiento_inventario(venta_id);
