-- ============================================================
-- Fase 1 — Base y accesos
-- Entidades: local, usuario, producto
-- ============================================================

-- Rol como ENUM fijo: los tres roles del negocio.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    CREATE TYPE rol_usuario AS ENUM ('admin', 'cajero', 'barista');
  END IF;
END$$;

-- ------------------------------------------------------------
-- LOCAL
-- Un solo local por ahora, pero todo cuelga de local_id para
-- permitir un segundo local a futuro sin rehacer el modelo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS local (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  direccion   TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- USUARIO
-- Cada usuario pertenece a un local y tiene un rol fijo.
-- El email es único (identificador de login).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id             SERIAL PRIMARY KEY,
  local_id       INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  nombre         TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  rol            rol_usuario NOT NULL,
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuario_local ON usuario(local_id);

-- ------------------------------------------------------------
-- PRODUCTO
-- Frappés y otros ítems vendibles. SKU único por local.
-- El precio se guarda en pesos enteros (CLP no usa decimales).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto (
  id          SERIAL PRIMARY KEY,
  local_id    INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  sku         TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  precio      INTEGER NOT NULL CHECK (precio >= 0),
  categoria   TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_producto_sku_local UNIQUE (local_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_producto_local ON producto(local_id);
