# AccFenix

Catálogo web de barrales, accesorios y kits para cortinas (sin precios), con un carrito que arma el pedido y lo envía por WhatsApp, y un panel de administración. La propuesta completa está en [`docs/acta.md`](docs/acta.md).

| Carpeta | Stack |
| --- | --- |
| `api/` | ASP.NET Core 8 (Minimal APIs) + EF Core + PostgreSQL + JWT + Cloudinary |
| `web/` | Next.js 15 (App Router) + Tailwind v4 + shadcn/ui + zustand |

## Desarrollo local

Requisitos: .NET 8 SDK, Node 20+, Docker.

```bash
# 1. Base de datos (Postgres en el puerto 5433 para no chocar con instalaciones locales)
docker compose up -d

# 2. API → http://localhost:5080
cd api
dotnet tool restore
dotnet run --project src/AccFenix.Api -- seed   # aplica migraciones + catálogo inicial + usuario admin
dotnet run --project src/AccFenix.Api

# 3. Web → http://localhost:3000   (panel en /admin)
cd web
cp .env.example .env.local
npm install
npm run dev
```

El admin de desarrollo está en `api/src/AccFenix.Api/appsettings.Development.json` (`admin@accfenix.local` / `admin1234`).

### Seed inicial

- **Barrales**: 10 medidas × 2 grosores × 3 colores = 60 variantes.
- **Accesorios**: 5 productos × 2 grosores × 3 colores = 30 variantes.
- **Kits**: 4 productos (1.20–1.60 y 1.80–3.00, cada uno en versión simple y doble) × su rango de medidas × grosor × color = 120 variantes.

El seed es idempotente: solo agrega lo que falta.

## Tests

```bash
cd api && dotnet test      # unitarios + integración (Testcontainers: requiere Docker)

# Sin Docker: usar un Postgres existente (el usuario necesita permiso CREATEDB; se crea y borra una base temporal)
ACCFENIX_TEST_DB="Host=localhost;Port=5433;Database=postgres;Username=...;Password=..." dotnet test
cd web && npm test         # vitest: mensaje de WhatsApp, carrito, selector de variantes
```

## Configuración de la API

Variables de entorno (formato ASP.NET, `__` separa secciones):

| Variable | Descripción |
| --- | --- |
| `ConnectionStrings__Default` | Cadena de conexión de PostgreSQL |
| `Jwt__Key` | Clave de firma de al menos 32 caracteres |
| `Cors__Origins__0` | Origen del sitio web (p. ej. `https://tu-dominio.com`) |
| `Admin__Email`, `Admin__Password` | Usuario admin que crea el seed (solo si no existe) |
| `Cloudinary__CloudName`, `Cloudinary__ApiKey`, `Cloudinary__ApiSecret` | Cuenta para fotos y videos. Sin estas variables, la subida queda deshabilitada |

Migraciones nuevas: `dotnet ef migrations add <Nombre> --project src/AccFenix.Api -o Data/Migrations`.

## Deploy sugerido

- **Web**: Vercel. Configurar `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_BRAND_NAME`.
- **API + Postgres**: Railway, Render o Fly.io. Ejecutar `dotnet AccFenix.Api.dll seed` una vez después del primer deploy (aplica las migraciones).
- La sesión admin es una cookie httpOnly en el dominio del sitio; el navegador nunca ve el JWT.

## Pendiente del cliente

- Logo y colores de marca: reemplazar las variables `--brand*` en `web/app/globals.css` y el placeholder del logo en `web/app/(public)/layout.tsx`.
- Número de WhatsApp real: se configura desde el panel (Configuración).
- Fotos y videos de los productos: se suben desde el panel (Productos → Fotos y videos).
