const { z } = require("zod");
const { pool, query } = require("../../config/db");
const { HttpError } = require("../../utils/errors");
const { asyncHandler } = require("../../utils/asyncHandler");
const { turnoAbierto } = require("../caja/caja.controller");
const { promosVigentes } = require("../promociones/promociones.controller");
const { getConfig } = require("../fidelidad/fidelidad.controller");

const registrarSchema = z.object({
  medioPago: z.enum(["efectivo", "debito", "credito", "transferencia"], {
    message: "Medio de pago inválido",
  }),
  clienteId: z.number().int().positive().optional(), // fidelidad (opcional)
  momento: z.enum(["al_momento", "despues", "programado"]).optional(),
  horaProgramada: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)").optional(),
  items: z
    .array(
      z.object({
        productoId: z.number().int().positive(),
        cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
      })
    )
    .min(1, "La venta debe tener al menos un producto"),
});

const anularSchema = z.object({
  motivo: z.string().trim().max(300).optional(),
});

const convenioSchema = z.object({
  motivo: z.string().trim().max(300).optional(),
  items: z
    .array(
      z.object({
        productoId: z.number().int().positive(),
        cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
      })
    )
    .min(1, "Debes indicar al menos un producto"),
});

const publicVenta = (v) => ({
  id: v.id,
  numero: v.numero,
  total: v.total,
  descuento: v.descuento != null ? Number(v.descuento) : 0,
  medioPago: v.medio_pago,
  estado: v.estado,
  esConvenio: v.es_convenio,
  clienteId: v.cliente_id,
  cajeroId: v.cajero_id,
  createdAt: v.created_at,
  anuladaEn: v.anulada_en,
  motivoAnulacion: v.motivo_anulacion,
});

// POST /api/ventas
const registrar = asyncHandler(async (req, res) => {
  const { medioPago, items, clienteId, momento = "al_momento", horaProgramada } = req.body;
  const localId = req.user.localId;

  const turno = await turnoAbierto(localId);
  if (!turno) throw new HttpError(400, "Debes abrir la caja antes de vender");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Cargamos los productos referenciados (activos y del local).
    const ids = [...new Set(items.map((i) => i.productoId))];
    const { rows: productos } = await client.query(
      `SELECT id, nombre, precio, activo FROM producto
        WHERE local_id = $1 AND id = ANY($2::int[])`,
      [localId, ids]
    );
    const mapa = new Map(productos.map((p) => [p.id, p]));

    let grossTotal = 0;
    const lineas = [];
    for (const item of items) {
      const p = mapa.get(item.productoId);
      if (!p) throw new HttpError(400, `Producto ${item.productoId} no existe en el local`);
      if (!p.activo) throw new HttpError(400, `El producto "${p.nombre}" está inactivo`);
      const subtotal = p.precio * item.cantidad;
      grossTotal += subtotal;
      lineas.push({
        productoId: p.id,
        nombre: p.nombre,
        precioUnit: p.precio,
        cantidad: item.cantidad,
        subtotal,
      });
    }

    const runner = (text, params) => client.query(text, params);

    // --- Promociones vigentes por producto (descuento automático) ---
    const promos = await promosVigentes(runner, localId, ids);
    let promoDescuento = 0;
    for (const l of lineas) {
      const promo = promos.get(l.productoId);
      if (!promo) continue;
      let d = promo.tipo === "porcentaje"
        ? Math.round((l.subtotal * promo.valor) / 100)
        : Math.round(promo.valor * l.cantidad); // 'monto' = descuento por unidad
      d = Math.min(d, l.subtotal);
      promoDescuento += d;
    }

    // --- Fidelidad (opcional): si el cliente llegó al umbral, aplica beneficio ---
    let cliente = null, redimio = false, beneficio = null, fidDescuento = 0;
    if (clienteId) {
      const { rows: crows } = await client.query(
        "SELECT * FROM cliente WHERE id = $1 AND local_id = $2 FOR UPDATE",
        [clienteId, localId]
      );
      cliente = crows[0];
      if (!cliente) throw new HttpError(400, "El cliente no existe en el local");
      const config = await getConfig(localId, runner);
      if (config.activo && cliente.compras_contador >= config.umbral) {
        redimio = true;
        if (config.tipo_beneficio === "gratis") {
          fidDescuento = Math.max(...lineas.map((l) => l.precioUnit)); // un frappé gratis
          beneficio = "Frappé gratis por fidelidad";
        } else {
          fidDescuento = Math.round(((grossTotal - promoDescuento) * Number(config.valor)) / 100);
          beneficio = `${Number(config.valor)}% de descuento por fidelidad`;
        }
      }
    }

    let descuento = promoDescuento + fidDescuento;
    if (descuento > grossTotal) descuento = grossTotal;
    const total = grossTotal - descuento;

    // Correlativo por local, protegido con advisory lock para evitar choques.
    await client.query("SELECT pg_advisory_xact_lock($1)", [localId]);
    const { rows: maxRows } = await client.query(
      "SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM venta WHERE local_id = $1",
      [localId]
    );
    const numero = maxRows[0].numero;

    const { rows: ventaRows } = await client.query(
      `INSERT INTO venta (local_id, caja_turno_id, cajero_id, numero, total, medio_pago, cliente_id, descuento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [localId, turno.id, req.user.id, numero, total, medioPago, clienteId || null, descuento]
    );
    const venta = ventaRows[0];

    for (const l of lineas) {
      await client.query(
        `INSERT INTO venta_item (venta_id, producto_id, nombre, precio_unit, cantidad, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [venta.id, l.productoId, l.nombre, l.precioUnit, l.cantidad, l.subtotal]
      );
    }

    // --- Fase 3: descontar insumos según la receta de cada producto ---
    const prodIds = [...new Set(lineas.map((l) => l.productoId))];
    const { rows: recetas } = await client.query(
      "SELECT producto_id, insumo_id, cantidad FROM receta_item WHERE producto_id = ANY($1::int[])",
      [prodIds]
    );
    // Acumular el consumo total por insumo (una venta puede repetir insumos).
    const consumoPorInsumo = new Map();
    for (const l of lineas) {
      for (const r of recetas) {
        if (r.producto_id !== l.productoId) continue;
        const total = Number(r.cantidad) * l.cantidad;
        consumoPorInsumo.set(r.insumo_id, (consumoPorInsumo.get(r.insumo_id) || 0) + total);
      }
    }

    const alertas = [];
    for (const [insumoId, consumo] of consumoPorInsumo) {
      // Movimiento de consumo (cantidad negativa) trazado a la venta.
      await client.query(
        `INSERT INTO movimiento_inventario (local_id, insumo_id, tipo, cantidad, venta_id, usuario_id, motivo)
         VALUES ($1, $2, 'consumo', $3, $4, $5, $6)`,
        [localId, insumoId, -consumo, venta.id, req.user.id, `Venta #${venta.numero}`]
      );
      // Se permite quedar en negativo (no bloquea la venta).
      const { rows: urows } = await client.query(
        "UPDATE insumo SET stock_actual = stock_actual - $1, updated_at = now() WHERE id = $2 RETURNING *",
        [consumo, insumoId]
      );
      const nuevoStock = Number(urows[0].stock_actual);
      if (nuevoStock <= Number(urows[0].umbral_alerta)) {
        alertas.push({
          insumoId,
          nombre: urows[0].nombre,
          unidad: urows[0].unidad,
          stockActual: nuevoStock,
          negativo: nuevoStock < 0,
        });
      }
    }

    // --- Fidelidad: actualizar contador / registrar canje ---
    if (cliente) {
      if (redimio) {
        await client.query(
          "UPDATE cliente SET compras_contador = 0, updated_at = now() WHERE id = $1",
          [cliente.id]
        );
        await client.query(
          "INSERT INTO canje (local_id, cliente_id, venta_id, beneficio) VALUES ($1,$2,$3,$4)",
          [localId, cliente.id, venta.id, beneficio]
        );
      } else {
        await client.query(
          "UPDATE cliente SET compras_contador = compras_contador + 1, updated_at = now() WHERE id = $1",
          [cliente.id]
        );
      }
    }

    // --- Fase 5: generar pedido para el barista ---
    await client.query(
      `INSERT INTO pedido (local_id, venta_id, momento, hora_programada)
       VALUES ($1, $2, $3, $4)`,
      [localId, venta.id, momento, momento === "programado" ? horaProgramada || null : null]
    );

    await client.query("COMMIT");
    res.status(201).json({
      venta: { ...publicVenta(venta), items: lineas },
      alertas,
      descuento,
      beneficio,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// GET /api/ventas?turnoId=  -> ventas del turno (por defecto, el turno abierto)
const listar = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  let turnoId = req.query.turnoId ? Number(req.query.turnoId) : null;

  if (!turnoId) {
    const turno = await turnoAbierto(localId);
    if (!turno) return res.json({ ventas: [] });
    turnoId = turno.id;
  }

  const { rows } = await query(
    `SELECT * FROM venta
      WHERE local_id = $1 AND caja_turno_id = $2
      ORDER BY numero DESC`,
    [localId, turnoId]
  );
  res.json({ ventas: rows.map(publicVenta) });
});

// GET /api/ventas/:id  -> venta con su detalle
const detalle = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const id = Number(req.params.id);
  const { rows } = await query(
    "SELECT * FROM venta WHERE id = $1 AND local_id = $2",
    [id, localId]
  );
  const venta = rows[0];
  if (!venta) throw new HttpError(404, "Venta no encontrada");

  const { rows: items } = await query(
    `SELECT producto_id AS "productoId", nombre, precio_unit AS "precioUnit",
            cantidad, subtotal
       FROM venta_item WHERE venta_id = $1 ORDER BY id`,
    [id]
  );
  res.json({ venta: { ...publicVenta(venta), items } });
});

// POST /api/ventas/:id/anular
const anular = asyncHandler(async (req, res) => {
  const localId = req.user.localId;
  const id = Number(req.params.id);
  const { motivo } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT v.*, t.estado AS turno_estado
         FROM venta v JOIN caja_turno t ON t.id = v.caja_turno_id
        WHERE v.id = $1 AND v.local_id = $2
        FOR UPDATE OF v`,
      [id, localId]
    );
    const venta = rows[0];
    if (!venta) throw new HttpError(404, "Venta no encontrada");
    if (venta.estado === "anulada") throw new HttpError(400, "La venta ya está anulada");
    if (venta.turno_estado !== "abierta") {
      throw new HttpError(400, "Solo se pueden anular ventas de la caja abierta");
    }

    // Devolver el stock: revertir cada consumo de esta venta.
    const { rows: consumos } = await client.query(
      "SELECT insumo_id, cantidad FROM movimiento_inventario WHERE venta_id = $1 AND tipo = 'consumo'",
      [id]
    );
    for (const c of consumos) {
      const devolucion = -Number(c.cantidad); // cantidad de consumo es negativa -> positiva
      await client.query(
        `INSERT INTO movimiento_inventario (local_id, insumo_id, tipo, cantidad, venta_id, usuario_id, motivo)
         VALUES ($1, $2, 'ajuste', $3, $4, $5, $6)`,
        [localId, c.insumo_id, devolucion, id, req.user.id, `Devolución por anulación venta #${venta.numero}`]
      );
      await client.query(
        "UPDATE insumo SET stock_actual = stock_actual + $1, updated_at = now() WHERE id = $2",
        [devolucion, c.insumo_id]
      );
    }

    const { rows: upd } = await client.query(
      `UPDATE venta
          SET estado = 'anulada', anulada_en = now(), anulada_por_id = $1, motivo_anulacion = $2
        WHERE id = $3 RETURNING *`,
      [req.user.id, motivo || null, id]
    );

    await client.query("COMMIT");
    res.json({ venta: publicVenta(upd[0]) });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// POST /api/ventas/convenio  (frappé regalado: $0, descuenta insumo real)
const registrarConvenio = asyncHandler(async (req, res) => {
  const { items, motivo } = req.body;
  const localId = req.user.localId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ids = [...new Set(items.map((i) => i.productoId))];
    const { rows: productos } = await client.query(
      "SELECT id, nombre, precio, activo FROM producto WHERE local_id = $1 AND id = ANY($2::int[])",
      [localId, ids]
    );
    const mapa = new Map(productos.map((p) => [p.id, p]));

    const lineas = [];
    let valorRegalado = 0;
    for (const item of items) {
      const p = mapa.get(item.productoId);
      if (!p) throw new HttpError(400, `Producto ${item.productoId} no existe en el local`);
      const subtotal = p.precio * item.cantidad; // valor de referencia (gasto marketing)
      valorRegalado += subtotal;
      lineas.push({ productoId: p.id, nombre: p.nombre, precioUnit: p.precio, cantidad: item.cantidad, subtotal });
    }

    await client.query("SELECT pg_advisory_xact_lock($1)", [localId]);
    const { rows: maxRows } = await client.query(
      "SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM venta WHERE local_id = $1",
      [localId]
    );
    const numero = maxRows[0].numero;

    // Venta de convenio: total 0, sin caja ni medio de pago.
    const { rows: ventaRows } = await client.query(
      `INSERT INTO venta (local_id, cajero_id, numero, total, es_convenio)
       VALUES ($1, $2, $3, 0, true) RETURNING *`,
      [localId, req.user.id, numero]
    );
    const venta = ventaRows[0];

    for (const l of lineas) {
      await client.query(
        `INSERT INTO venta_item (venta_id, producto_id, nombre, precio_unit, cantidad, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [venta.id, l.productoId, l.nombre, l.precioUnit, l.cantidad, l.subtotal]
      );
    }

    // Descontar insumos igual que una venta normal.
    const { rows: recetas } = await client.query(
      "SELECT producto_id, insumo_id, cantidad FROM receta_item WHERE producto_id = ANY($1::int[])",
      [ids]
    );
    const consumoPorInsumo = new Map();
    for (const l of lineas) {
      for (const r of recetas) {
        if (r.producto_id !== l.productoId) continue;
        consumoPorInsumo.set(r.insumo_id, (consumoPorInsumo.get(r.insumo_id) || 0) + Number(r.cantidad) * l.cantidad);
      }
    }
    const alertas = [];
    for (const [insumoId, consumo] of consumoPorInsumo) {
      await client.query(
        `INSERT INTO movimiento_inventario (local_id, insumo_id, tipo, cantidad, venta_id, usuario_id, motivo)
         VALUES ($1,$2,'consumo',$3,$4,$5,$6)`,
        [localId, insumoId, -consumo, venta.id, req.user.id, `Convenio gimnasio${motivo ? " - " + motivo : ""}`]
      );
      const { rows: urows } = await client.query(
        "UPDATE insumo SET stock_actual = stock_actual - $1, updated_at = now() WHERE id = $2 RETURNING *",
        [consumo, insumoId]
      );
      const nuevoStock = Number(urows[0].stock_actual);
      if (nuevoStock <= Number(urows[0].umbral_alerta)) {
        alertas.push({ insumoId, nombre: urows[0].nombre, unidad: urows[0].unidad, stockActual: nuevoStock, negativo: nuevoStock < 0 });
      }
    }

    // Pedido para el barista (frappé de convenio a preparar).
    await client.query(
      "INSERT INTO pedido (local_id, venta_id, momento) VALUES ($1, $2, 'al_momento')",
      [localId, venta.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ venta: { ...publicVenta(venta), items: lineas }, valorRegalado, alertas });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// GET /api/ventas/convenio  (historial de frappés de convenio)
const listarConvenio = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT v.*,
            (SELECT COALESCE(SUM(subtotal),0) FROM venta_item WHERE venta_id = v.id)::int AS valor
       FROM venta v
      WHERE v.local_id = $1 AND v.es_convenio = true
      ORDER BY v.created_at DESC LIMIT 100`,
    [req.user.localId]
  );
  res.json({
    convenios: rows.map((v) => ({ ...publicVenta(v), valorRegalado: v.valor })),
  });
});

module.exports = {
  registrar, listar, detalle, anular, registrarConvenio, listarConvenio,
  registrarSchema, anularSchema, convenioSchema,
};
