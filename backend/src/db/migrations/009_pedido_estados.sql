-- ============================================================
-- Amplía los estados del pedido:
--   'pendiente' (= En espera) → 'en_preparacion' → 'listo' → 'entregado'
-- (el valor antiguo 'preparado' queda en desuso; no se puede quitar de un ENUM).
-- ADD VALUE no puede USARSE en la misma transacción en que se agrega, por eso
-- las columnas y cualquier uso van en migraciones separadas.
-- ============================================================
ALTER TYPE pedido_estado ADD VALUE IF NOT EXISTS 'en_preparacion';
ALTER TYPE pedido_estado ADD VALUE IF NOT EXISTS 'listo';
ALTER TYPE pedido_estado ADD VALUE IF NOT EXISTS 'entregado';
