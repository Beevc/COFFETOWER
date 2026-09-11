-- ============================================================
-- Fidelización por niveles: varios premios según nº de compras.
-- Ej: 5→algo, 10→algo, 15→algo, 20→algo. Al llegar al nivel más alto
-- el contador del cliente se reinicia (empieza otro ciclo).
-- Tipos de premio: gratis (frappé gratis), monto ($ de descuento), regalo (texto).
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_premio') THEN
    CREATE TYPE tipo_premio AS ENUM ('gratis', 'monto', 'regalo');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS fidelidad_premio (
  id          SERIAL PRIMARY KEY,
  local_id    INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  compras     INTEGER NOT NULL CHECK (compras > 0),   -- nº de compras para ganarlo
  tipo        tipo_premio NOT NULL,
  valor       INTEGER NOT NULL DEFAULT 0 CHECK (valor >= 0), -- $ cuando tipo = 'monto'
  descripcion TEXT,                                    -- texto del premio (obligatorio si 'regalo')
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_premio_compras UNIQUE (local_id, compras)
);
CREATE INDEX IF NOT EXISTS idx_premio_local ON fidelidad_premio(local_id);
