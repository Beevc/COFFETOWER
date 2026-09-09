-- Agrega la unidad "pams" al ENUM unidad_insumo.
-- ALTER TYPE ... ADD VALUE funciona dentro de una transacción en PostgreSQL 12+
-- siempre que el nuevo valor no se USE en la misma transacción (aquí solo se agrega).
ALTER TYPE unidad_insumo ADD VALUE IF NOT EXISTS 'pams';
