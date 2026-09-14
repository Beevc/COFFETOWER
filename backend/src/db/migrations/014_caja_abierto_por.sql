-- ============================================================
-- La caja ahora la abre el administrador, asignando un cajero.
-- caja_turno.cajero_id = cajero asignado; abierto_por_id = quién la abrió (admin).
-- ============================================================
ALTER TABLE caja_turno
  ADD COLUMN IF NOT EXISTS abierto_por_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL;
