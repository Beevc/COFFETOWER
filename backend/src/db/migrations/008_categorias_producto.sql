-- ============================================================
-- Categorías de producto en árbol de 3 niveles:
--   nivel 1 = Categoría        (ej. Bebidas Frías / Bebidas Calientes)
--   nivel 2 = Subcategoría     (ej. Frappe / Latte Frío)
--   nivel 3 = Con/Sin café     (ej. Con Café / Sin Café)
-- Cada fila apunta a su padre con parent_id (los de nivel 1 tienen parent NULL).
-- El producto referencia el nivel más específico elegido (categoria_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS categoria_producto (
  id         SERIAL PRIMARY KEY,
  local_id   INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  parent_id  INTEGER REFERENCES categoria_producto(id) ON DELETE CASCADE,
  nivel      SMALLINT NOT NULL CHECK (nivel BETWEEN 1 AND 3),
  nombre     TEXT NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nombre único entre hermanos (mismo padre). Nivel 1 (parent NULL) es único por local.
CREATE UNIQUE INDEX IF NOT EXISTS uq_categoria_raiz
  ON categoria_producto (local_id, nombre) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_categoria_hijo
  ON categoria_producto (parent_id, nombre) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categoria_parent ON categoria_producto(parent_id);
CREATE INDEX IF NOT EXISTS idx_categoria_local ON categoria_producto(local_id);

-- El producto apunta al nodo de categoría más específico elegido.
-- Si se borra esa categoría, el producto queda sin categoría (no se borra).
ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS categoria_id INTEGER
    REFERENCES categoria_producto(id) ON DELETE SET NULL;
