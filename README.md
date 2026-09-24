# Matrículas Nuestra Señora de Guadalupe

Plataforma de matrículas escolares: SPA en **React + Vite + TypeScript**, API en
**Express + Drizzle ORM** y base de datos **Neon PostgreSQL**, lista para
desplegarse en **Vercel** (funciones serverless en `/api`).

```
artifacts/
├── api/                    → Vercel Function que expone la API (Express)
├── api-server/             → Código de la API (Express + Drizzle + Neon)
│   ├── src/db/             → Cliente Drizzle y esquema (incluye system_settings)
│   ├── src/routes/         → Rutas /healthz, /settings, /matriculas, /admin
│   └── scripts/            → build serverless y seed del administrador
├── matriculas-guadalupe/   → SPA (Vite) servida como sitio estático
├── vercel.json             → Build, output y rewrites (SPA + /api)
└── package.json            → Scripts y dependencias que Vercel instala en la raíz
```

## 1. Requisitos

- Node.js **20.12+** (recomendado 22 o 24) y npm 10+.
- Una base de datos **Neon PostgreSQL** (copia la cadena `postgresql://...`).

## 2. Instalación local (Windows)

```powershell
# desde la raíz del proyecto
npm run install:all
```

Crea `api-server/.env.local` a partir de `api-server/.env.example`:

```ini
DATABASE_URL=postgresql://usuario:clave@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_DRIVER=postgres
JWT_SECRET=cambia-este-secreto-largo
```

Crea las tablas y el administrador principal:

```powershell
npm run db:push     # drizzle-kit push (crea acudientes, estudiantes, matriculas,
                    # transacciones, usuarios_admin y system_settings)
npm run db:seed     # administrador admin@colegio.edu.co / Guadalupe2026
```

Levanta los dos procesos en terminales separadas:

```powershell
npm run dev:api     # API en http://localhost:3000
npm run dev:web     # SPA en http://localhost:5000 (proxy /api → :3000)
```

Acceso al panel: `http://localhost:5000/admin/login`.

## 3. Despliegue en Vercel

### 3.1 Variables de entorno (Project → Settings → Environment Variables)

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión de Neon (con `?sslmode=require`) |
| `DATABASE_DRIVER` | `postgres` (por defecto) o `neon` para `@neondatabase/serverless` |
| `JWT_SECRET` | Cadena aleatoria larga para firmar los JWT del panel |

### 3.2 Configuración del proyecto

1. Importa el repositorio en Vercel.
2. **Root Directory: la raíz del repositorio** (la carpeta que contiene
   `vercel.json`, `api/`, `api-server/` y `matriculas-guadalupe/`). No lo
   cambies a `matriculas-guadalupe`.
3. Framework Preset: **Other** (`vercel.json` ya define `framework: null`).
4. Deja vacíos *Build Command*, *Output Directory* e *Install Command*: los toma
   de `vercel.json`:

   - Install: `npm install` en la raíz, en `api-server` y en `matriculas-guadalupe`.
   - Build: `api-server` → `dist/serverless.cjs` y `matriculas-guadalupe` → `dist/`.
   - Output: `matriculas-guadalupe/dist`.

### 3.3 Rutas

| Ruta | Destino |
| --- | --- |
| `/api`, `/api/*` | Vercel Function `api/index.ts` (Express) |
| cualquier otra | `index.html` (React Router / Wouter) |

Los archivos estáticos (`/assets/*`) se sirven desde la CDN antes de aplicar los
rewrites, por lo que nunca se ven afectados por el fallback de la SPA.

## 4. Configuración de la Institución (panel admin)

En `/admin/dashboard` → **Configuración de la Institución** se pueden editar y
guardar en Neon (tabla `system_settings`, fila `id = 1`):

1. **Logo**: URL, ruta local o carga desde el equipo (se guarda como data URL, máx. 400 KB).
2. **Apariencia**: URL de la imagen de fondo del sitio público y color principal
   (afecta a `--primary`, `--ring` y `--primary-foreground` en todo el tema).
3. **Información institucional**: nombre, dirección, teléfono, WhatsApp, correo y
   texto de bienvenida.

La pantalla pública (`/`, `/consultar`, `/admin/login`) lee `GET /api/settings` en
tiempo real: encabezado, logo, fondo, color, WhatsApp y datos de contacto.

### Endpoints de configuración

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/settings` | Público | Devuelve la configuración vigente |
| `PUT` | `/api/settings` | `Bearer` de admin | Guarda (parcial o total) la configuración |
| `POST` | `/api/settings` | `Bearer` de admin | Igual que `PUT` |

## 5. Base de datos

El esquema Drizzle vive en `api-server/src/db/schema` (única fuente de verdad):

- `acudientes`, `estudiantes`, `matriculas`, `transacciones`, `usuarios_admin`.
- `system_settings`: fila única con logo, fondo, color, datos de contacto y
  texto de bienvenida (`updated_at`, `updated_by`).

```powershell
npm run db:push     # aplica el esquema a Neon
npm run db:seed     # crea/actualiza el admin y la fila de configuración
```

También se puede ejecutar desde el frontend (`npm --prefix matriculas-guadalupe run db:push`),
que reutiliza el mismo esquema.

## 6. Comprobaciones

```powershell
npm run typecheck   # api-server + SPA (ambos limpios)
npm run build       # bundle serverless + build de Vite  ← es lo que ejecuta Vercel
npm run smoke       # 4 pruebas sobre el handler serverless (salud, prefijo, 404, settings)
npm --prefix api-server run build   # servidor Node autocontenido (dist/serverless.cjs incluido)
```

Salida esperada de `npm run smoke`:

```
OK   ruta normal (/api/healthz) -> 200 {"status":"ok"}
OK   ruta sin prefijo (normalización) -> 200 {"status":"ok"}
OK   404 controlado -> 404 {"error":"Ruta no encontrada."}
OK   configuración institucional (público) -> 200 {"school_name":"..."}
```

El endpoint `GET /api/settings` responde con los valores por defecto aunque la
tabla `system_settings` todavía no exista o Neon no sea accesible, de modo que la
pantalla pública nunca se rompe.

### Detalles técnicos relevantes

- **`api/index.ts` + rewrites**: las Vercel Functions fuera de Next.js **no**
  soportan catch-all (`api/[...slug].ts`); por eso `vercel.json` enruta
  `/api` y `/api/(.*)` a la función `api/index`, que recibe la ruta original
  (`/api/healthz`, `/api/settings`, …). El middleware de normalización de
  `src/app.ts` también acepta rutas sin el prefijo `/api`.
- **Express pre-empaquetado**: `api-server/scripts/build-serverless.mjs` genera
  `api-server/dist/serverless.cjs` (CJS, `module.exports = app`) para evitar
  problemas de resolución ESM/CJS dentro de `node_modules`. `pino`,
  `pino-http`, `thread-stream` y `ws` quedan como `external` y se resuelven
  desde las dependencias declaradas en el `package.json` raíz (que Vercel
  instala).
- **Order de routing en Vercel**: archivos estáticos → funciones del sistema de
  archivos → rewrites. Los assets de `/assets/*` nunca pasan por el fallback de
  la SPA.
- **Imágenes del panel**: se aceptan URL, ruta local o archivo del equipo
  (máximo 400 KB; se guarda como data URL dentro del límite de 4 MB del body).
- Retira `mockup-sandbox/`: es un andamiaje de Replit sin relación con el
  sistema de matrículas y todavía contiene dependencias `catalog:` / `@replit/*`.

## 7. Solución de problemas

| Síntoma | Causa / solución |
| --- | --- |
| `DATABASE_URL must be set` | Falta la variable en Vercel o en `api-server/.env.local`. |
| La API responde 404 en Vercel | El *Root Directory* no es la raíz del repo (debe contener `api/` y `vercel.json`). |
| `/consultar` da 404 al recargar | Comprueba que `vercel.json` tenga el rewrite a `/index.html`. |
| La configuración muestra los valores por defecto | Ejecuta `npm run db:push` para crear `system_settings` (la API devuelve defaults y registra el error en los logs). |
| `postgres` no conecta | Añade `?sslmode=require` a `DATABASE_URL` y usa el host `-pooler` de Neon. |
| Los cambios de logo/color no aparecen | Haz *hard refresh* (Ctrl+Shift+R): la configuración se cachea 60 s en el cliente. |
