# Dashboard de Gestión — Tienda de Frappé (un solo local)
## Documento técnico de arquitectura

---

## 1. Objetivo del sistema

Plataforma web para administrar un **único local** de frappé, con dos formas de acceso: control remoto total desde la casa (dueño/a) y operación diaria en el local (cajero y barista). El sistema centraliza ventas, caja, inventario, recetas, estadísticas, promociones, fidelidad de clientes y el convenio con el gimnasio asociado.

A diferencia de un sistema multi-sucursal, aquí no hay que resolver "N sucursales" — hay un solo punto de venta, un solo inventario y una sola caja. Eso simplifica bastante el modelo de datos, pero el sistema queda diseñado de forma que agregar una segunda sucursal en el futuro no obligue a rehacerlo desde cero (basta con separar inventario/caja/ventas por local).

**Principios de diseño:**
- Todo en línea: el dueño/a ve el local en tiempo real sin estar físicamente ahí.
- Un solo sistema, tres niveles de visibilidad según rol (administrador, cajero, barista).
- Descuento automático de insumos según receta al momento de la venta.
- Trazabilidad: quién abrió/cerró caja, quién vendió qué, cuándo.

---

## 2. Roles y permisos (RBAC)

| Rol | Alcance | Permisos principales |
|---|---|---|
| **Administrador** | Todo el local, remoto | Acceso total: inventario, recetas, precios, estadísticas, promociones, fidelidad, configuración del convenio con el gimnasio |
| **Cajero/a** | Punto de venta | Apertura/cierre de caja, registro de ventas, formas de pago — sin acceso a edición de recetas ni estadísticas globales |
| **Barista** | Preparación | Ve pedidos pendientes y su estado (al momento / después / programado), marca pedidos como preparados — sin acceso a caja ni precios |

Cada usuario se crea con un rol fijo. El administrador es quien crea y edita las cuentas de cajero y barista.

---

## 3. Módulos principales

### 3.1 Ventas y caja
- Apertura de caja con monto inicial declarado.
- Registro de ventas con distintas formas de pago (efectivo, débito, crédito, transferencia).
- Cierre de caja: compara lo esperado (monto inicial + ventas en efectivo) vs. lo contado, registra diferencias.
- Historial de cierres de caja por día/turno.

### 3.2 Inventario y recetas
- Cada frappé tiene una **receta**: lista de insumos con cantidad exacta (ej. 200ml leche, 30g café, 50g helado).
- Cada insumo tiene su propio stock (litros, kg, unidades).
- Al registrarse una venta, el sistema resta automáticamente del stock de cada insumo la cantidad indicada en la receta × cantidad vendida.
- Alertas de stock bajo por insumo, con umbral configurable.
- Registro de movimientos: ingreso de insumos (compras), consumo por venta, merma.

### 3.3 Estadísticas
- Ventas diarias, semanales y mensuales.
- Ranking de frappés más vendidos y menos vendidos, en los mismos tres períodos.
- Desglose por forma de pago.

### 3.4 Promociones y ofertas
- Descuentos por producto o combo, con fecha de vigencia configurable.

### 3.5 Fidelidad
- Tarjeta por cliente (identificado por teléfono o nombre).
- Contador de compras; al alcanzar un umbral configurable (ej. 5 compras) se activa un beneficio (ej. 6to gratis o 50% de descuento).

### 3.6 Convenio con el gimnasio
- Registro de frappés regalados como un tipo de "venta" especial: precio $0, pero descuenta insumo real del inventario igual que una venta normal.
- Se categoriza aparte como "merma/inversión — convenio gimnasio", para no mezclarse con las ventas reales pero sí quedar reflejado en los reportes como gasto de marketing.

### 3.7 Panel del barista
- Lista de pedidos pendientes, generados automáticamente al cerrar una venta.
- Cada pedido indica si se prepara al momento, después, o a una hora programada.
- El barista marca el pedido como preparado; queda registrado quién y cuándo.

---

## 4. Modelo de datos (entidades principales)

- **Local** → tiene **Inventario**, **Caja**, **Ventas**, **Usuarios** (en este caso, uno solo, pero deja la puerta abierta a un segundo local a futuro)
- **Producto (frappé)** → tiene una **Receta** (tabla intermedia producto–insumo–cantidad)
- **Insumo** → tiene **Stock**, historial de **Movimientos** (ingreso, consumo, merma)
- **Venta** → pertenece a un **Turno/Cierre de caja**, tiene uno o más **Productos vendidos**, un **Medio de pago**, y opcionalmente un **Pedido** asociado para el barista
- **Pedido** → pertenece a una **Venta**, tiene **Estado** (pendiente/preparado) y **Momento de preparación** (al momento/después/programado)
- **Cierre_caja** → tiene **Turno**, **Cajero/a**, monto inicial/final, lista de ventas asociadas
- **Cliente_fidelidad** → tiene **Contador de compras**, historial de canjes
- **Convenio_gimnasio** → registro de frappés regalados, con fecha e insumo descontado

---

## 5. Stack tecnológico sugerido

| Capa | Opción sugerida | Motivo |
|---|---|---|
| Frontend | React (web) | Interfaz por rol (admin, cajero, barista), responsive para tablet en el local |
| Backend | Node.js o Python (FastAPI/Django) | API REST, lógica de descuento de insumos y permisos por rol |
| Base de datos | PostgreSQL | Relacional, integridad de datos entre ventas, recetas e inventario |
| Hosting | Cloud (ej. Render, Railway) | Acceso en línea desde la casa sin depender de un servidor local |
| Autenticación | JWT + roles | Login diferenciado para administrador, cajero y barista |
| Boleta | Comprobante interno simple, generado y visible en pantalla (sin impresión física ni integración con boleta electrónica SII) | El negocio no requiere impresora de boletas ni documento tributario electrónico por ahora |

---

## 6. Puntos a definir antes de desarrollar

1. **¿El local cobra con POS de tarjeta tradicional (Transbank) o se integrará un sistema de boleta electrónica desde el inicio?** — define el alcance real del módulo de ventas.
2. **¿Se va a imprimir boleta/comprobante físico?** — si sí, definir modelo de impresora (la mayoría usa protocolo ESC/POS).
3. **Cantidad y tipo de insumos a controlar** — para dimensionar bien las recetas (algunos insumos muy exactos como el café, otros más flexibles como toppings).
4. **Reglas exactas de la tarjeta de fidelidad** — ¿es por compra de cualquier producto o solo ciertos frappés? ¿el beneficio es gratis o porcentaje?
5. **Frecuencia y condiciones del convenio con el gimnasio** — ¿cuántos frappés, cada cuánto tiempo, se registra automático o lo carga el administrador manualmente?

---

## 7. Roadmap sugerido (fases)

**Fase 1 — Base y accesos**
Modelo de datos (productos, recetas, insumos, ventas, caja, usuarios) y login con los tres roles.

**Fase 2 — Ventas y caja**
Pantalla de venta (POS), apertura y cierre de caja, formas de pago.

**Fase 3 — Inventario y recetas**
Carga de recetas por producto y descuento automático de insumos al vender.

**Fase 4 — Estadísticas y fidelidad**
Reportes diarios/semanales/mensuales, ranking de productos, promociones, tarjetas de fidelidad y registro del convenio con el gimnasio.

**Fase 5 — Barista y cierre**
Panel de pedidos pendientes con estados, pruebas generales y ajustes finales antes de poner el sistema en uso real.

---

*Este documento es la base para definir el prototipo funcional (siguiente paso).*
