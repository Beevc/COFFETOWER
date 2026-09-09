# Guía de despliegue — Frappé Gestión

Arquitectura en la nube:
- **Frontend** (React) → **Vercel**
- **Backend** (API Express) → **Render**
- **Base de datos** → **Supabase** (ya está lista)

El orden importa: primero el backend (para tener su URL), luego el frontend.

---

## Paso A — Subir el código a GitHub

1. Crea una cuenta en https://github.com (si no tienes) y un repositorio nuevo, por ejemplo `frappe-gestion` (puede ser privado).
2. En tu PC, dentro de `F:\Frappes`, sube el proyecto (Claude ya dejó el repo Git iniciado con el primer commit). Solo falta conectarlo a GitHub:

   ```bash
   git remote add origin https://github.com/TU-USUARIO/frappe-gestion.git
   git branch -M main
   git push -u origin main
   ```

> El `.env` con la contraseña NO se sube (está en `.gitignore`). Las variables se cargan aparte en Render/Vercel.

---

## Paso B — Backend en Render

1. Crea cuenta en https://render.com y entra con tu GitHub.
2. **New → Web Service** → elige el repo `frappe-gestion`.
3. Configura:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. En **Environment**, agrega estas variables (copia los valores desde tu `backend/.env` local):
   | Clave | Valor |
   |---|---|
   | `DATABASE_URL` | (tu cadena de Supabase, la misma del `.env`) |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | (el mismo secreto largo del `.env`) |
   | `JWT_EXPIRES_IN` | `8h` |
   | `NODE_ENV` | `production` |
5. **Create Web Service.** Cuando termine, copia la URL pública, algo como:
   `https://frappe-gestion.onrender.com`
6. Verifica que vive: abre `https://frappe-gestion.onrender.com/api/health` → debe responder `{"ok":true}`.

> Nota del plan gratis: el servicio "se duerme" tras un rato sin uso; la primera visita después puede tardar ~30–60 s en despertar.

---

## Paso C — Frontend en Vercel

1. Crea cuenta en https://vercel.com y entra con tu GitHub.
2. **Add New → Project** → importa el repo `frappe-gestion`.
3. Configura:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (se detecta solo)
   - Build Command y Output (`dist`) se autodetectan.
4. En **Environment Variables**, agrega:
   | Clave | Valor |
   |---|---|
   | `VITE_API_URL` | `https://frappe-gestion.onrender.com/api` (la URL de Render del paso B + `/api`) |
5. **Deploy.** Al terminar te da una URL como `https://frappe-gestion.vercel.app`.

---

## Paso D — Conectar los dos (CORS)

1. Vuelve a Render → tu servicio → **Environment** → agrega:
   | Clave | Valor |
   |---|---|
   | `CORS_ORIGIN` | `https://frappe-gestion.vercel.app` (tu dominio de Vercel) |
2. Guarda: Render reinicia el backend solo.
3. Abre tu dominio de Vercel en el teléfono o donde sea e inicia sesión.

Credenciales de prueba:
- admin@frappe.local / admin1234
- cajero@frappe.local / cajero123
- barista@frappe.local / barista123

---

## Cada vez que hagamos cambios

Basta con subir a GitHub y ambos se actualizan solos:

```bash
git add -A
git commit -m "descripcion del cambio"
git push
```

Render y Vercel redespliegan automáticamente con cada push a `main`.
