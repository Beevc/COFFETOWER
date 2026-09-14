-- ============================================================
-- Rol combinado: un usuario que es cajero Y barista a la vez.
-- El middleware requireRole trata 'cajero_barista' como que tiene ambos permisos.
-- ============================================================
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'cajero_barista';
