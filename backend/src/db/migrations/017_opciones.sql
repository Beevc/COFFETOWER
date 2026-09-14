-- ============================================================
-- Personalización de productos (opciones globales):
--   'extra'       -> suma precio y consume un insumo (ej. proteína).
--   'sustitucion' -> reemplaza un insumo por otro en la receta (ej. leche -> almendra),
--                    con un delta de precio. Al vender no descuenta el origen y
--                    descuenta el reemplazo (misma cantidad que la receta).
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_opcion') THEN
    CREATE TYPE tipo_opcion AS ENUM ('extra', 'sustitucion');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS opcion (
  id                   SERIAL PRIMARY KEY,
  local_id             INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  nombre               TEXT NOT NULL,
  tipo                 tipo_opcion NOT NULL,
  precio               INTEGER NOT NULL DEFAULT 0 CHECK (precio >= 0), -- delta $
  insumo_id            INTEGER REFERENCES insumo(id) ON DELETE SET NULL, -- extra: consume este insumo
  cantidad             NUMERIC(12,3),                                    -- extra: cantidad (unidad real del insumo)
  insumo_origen_id     INTEGER REFERENCES insumo(id) ON DELETE SET NULL, -- sustitucion: insumo reemplazado
  insumo_reemplazo_id  INTEGER REFERENCES insumo(id) ON DELETE SET NULL, -- sustitucion: insumo que entra
  activo               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opcion_local ON opcion(local_id);

-- Opciones aplicadas a cada línea de venta (snapshot de nombre y precio).
CREATE TABLE IF NOT EXISTS venta_item_opcion (
  id             SERIAL PRIMARY KEY,
  venta_item_id  INTEGER NOT NULL REFERENCES venta_item(id) ON DELETE CASCADE,
  opcion_id      INTEGER REFERENCES opcion(id) ON DELETE SET NULL,
  nombre         TEXT NOT NULL,
  precio         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_vio_item ON venta_item_opcion(venta_item_id);
