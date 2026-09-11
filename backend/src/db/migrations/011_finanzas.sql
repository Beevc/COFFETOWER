-- ============================================================
-- Finanzas (solo admin): cuentas por pagar con proveedores,
-- facturas, abonos (pagos) y compras ligadas al inventario.
-- ============================================================

-- Categorías de gasto.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_gasto') THEN
    CREATE TYPE categoria_gasto AS ENUM
      ('insumos', 'arriendo', 'sueldos', 'servicios', 'equipamiento', 'otros');
  END IF;
END$$;

-- ------------------------------------------------------------
-- PROVEEDOR — para agrupar las deudas por proveedor.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedor (
  id          SERIAL PRIMARY KEY,
  local_id    INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  nombre      TEXT NOT NULL,
  contacto    TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_proveedor_nombre_local UNIQUE (local_id, nombre)
);
CREATE INDEX IF NOT EXISTS idx_proveedor_local ON proveedor(local_id);

-- ------------------------------------------------------------
-- FACTURA — cuenta por pagar. El saldo y el estado (pendiente/
-- parcial/pagada) se calculan a partir de los pagos (abonos).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS factura (
  id                 SERIAL PRIMARY KEY,
  local_id           INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  proveedor_id       INTEGER REFERENCES proveedor(id) ON DELETE SET NULL,
  numero             TEXT,                          -- N° de factura del proveedor (opcional)
  categoria          categoria_gasto NOT NULL,
  descripcion        TEXT,
  fecha_emision      DATE NOT NULL,
  fecha_vencimiento  DATE,
  monto_total        INTEGER NOT NULL CHECK (monto_total >= 0),
  creado_por_id      INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_factura_local ON factura(local_id);
CREATE INDEX IF NOT EXISTS idx_factura_vencimiento ON factura(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_factura_proveedor ON factura(proveedor_id);

-- ------------------------------------------------------------
-- FACTURA_ITEM — solo para compras de insumos: cada ítem suma
-- stock al inventario (movimiento de ingreso) al crear la factura.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS factura_item (
  id          SERIAL PRIMARY KEY,
  factura_id  INTEGER NOT NULL REFERENCES factura(id) ON DELETE CASCADE,
  insumo_id   INTEGER NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
  cantidad    NUMERIC(12,3) NOT NULL CHECK (cantidad > 0)
);
CREATE INDEX IF NOT EXISTS idx_factura_item_factura ON factura_item(factura_id);

-- ------------------------------------------------------------
-- PAGO — abono contra una factura (parcial o total).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pago (
  id             SERIAL PRIMARY KEY,
  local_id       INTEGER NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
  factura_id     INTEGER NOT NULL REFERENCES factura(id) ON DELETE CASCADE,
  fecha          DATE NOT NULL,
  monto          INTEGER NOT NULL CHECK (monto > 0),
  medio_pago     medio_pago NOT NULL,
  nota           TEXT,
  creado_por_id  INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pago_factura ON pago(factura_id);

-- Enlaza los movimientos de inventario generados por una compra (factura).
ALTER TABLE movimiento_inventario
  ADD COLUMN IF NOT EXISTS factura_id INTEGER REFERENCES factura(id) ON DELETE SET NULL;
