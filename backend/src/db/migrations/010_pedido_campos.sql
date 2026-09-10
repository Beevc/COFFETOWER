-- ============================================================
-- Campos nuevos del pedido:
--   nombre_cliente     -> nombre para llamar el pedido (escrito en caja o del cliente)
--   en_preparacion_en  -> cuándo el barista empezó a prepararlo
--   listo_en           -> cuándo quedó listo
--   entregado_en       -> cuándo se entregó al cliente
--   entregado_por_id   -> quién lo entregó (caja)
-- (preparado_por_id / preparado_en existentes = barista que lo trabajó)
-- ============================================================
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS nombre_cliente    TEXT,
  ADD COLUMN IF NOT EXISTS en_preparacion_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS listo_en          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entregado_en      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entregado_por_id  INTEGER REFERENCES usuario(id) ON DELETE SET NULL;
