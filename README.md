# Coffetower — Gestión Tienda de Frappé

Sistema web para administrar una tienda de frappé de un solo local, con acceso remoto para el dueño/a y operación diaria en el local.

## Roles
- **Administrador**: usuarios, productos, insumos y recetas, promociones, fidelidad, convenio con el gimnasio y estadísticas (todo en remoto).
- **Cajero/a**: apertura/cierre de caja, punto de venta (POS), medios de pago, comprobante en pantalla.
- **Barista**: panel de pedidos pendientes con su momento de preparación; los marca como preparados.

## Funcionalidades
- Login por rol con JWT.
- Ventas con descuento automático de insumos según receta y alertas de stock bajo.
- Promociones por producto con vigencia (descuento automático al vender).
- Tarjetas de fidelidad (contador por cliente; beneficio configurable).
- Convenio gimnasio: frappés regalados ($0) que descuentan insumo real.
- Estadísticas de ventas (día/semana/mes), ranking de productos y desglose por forma de pago.

## Stack
- **Frontend**: React + Vite + Tailwind CSS → desplegado en Vercel.
- **Backend**: Node.js + Express (API REST) → desplegado en Render.
- **Base de datos**: PostgreSQL (Supabase).
- **Auth**: JWT.

## Estructura
```
backend/    API REST (Express) + migraciones SQL + seed
frontend/   App React (Vite + Tailwind)
DEPLOY.md   Guía de despliegue (Vercel + Render)
```

## Desarrollo local
Backend:
```
cd backend && npm install && cp .env.example .env   # completar .env
npm run migrate && npm run seed
npm run dev
```
Frontend:
```
cd frontend && npm install
npm run dev
```

El frontend usa `VITE_API_URL` en producción; en local usa el proxy de Vite hacia el backend.
