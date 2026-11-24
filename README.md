# ColdCup

Catálogo web de una distribuidora de huevos. Cada producto se vende por presentación (maple, medio cajón, cajón) con precio minorista y mayorista por variante; a partir de un umbral mayorista configurable se aplica el precio mayorista. El carrito arma el pedido y lo envía por WhatsApp o desde la web. La entrega es con camión propio: los pedidos guardan la ubicación de entrega y el panel permite armar recorridos manuales. El panel de administración (`/admin`) gestiona catálogo, precios, fotos, pedidos y configuración.

| Carpeta | Stack |
| --- | --- |
| `api/` | ASP.NET Core 8 (Minimal APIs) + EF Core + PostgreSQL + JWT + Cloudinary |
| `web/` | Next.js 15.5.29 (App Router) + React 19 + Tailwind v4 + shadcn/ui + zustand + motion + three.js (intro) |

## Desarrollo local

Requisitos: .NET 8 SDK, Node 20+, Docker.

```bash
# 1. Base de datos (Postgres en el puerto 5433 para no chocar con instalaciones locales)
docker compose up -d

# 2. API → http://localhost:5080
cd api
dotnet tool restore
# crear src/AccFenix.Api/appsettings.Development.json (ver abajo)
dotnet run --project src/AccFenix.Api -- seed   # aplica migraciones + catálogo inicial + usuario admin
dotnet run --project src/AccFenix.Api

# 3. Web → http://localhost:3000   (panel en /admin)
cd web
cp .env.example .env.local
npm install
npm run dev
```

`api/src/AccFenix.Api/appsettings.Development.json` no se versiona; cada desarrollador lo crea con sus valores. Mínimo necesario (la cadena coincide con `docker-compose.yml`):

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5433;Database=accfenix;Username=accfenix;Password=accfenix"
  },
  "Jwt": {
    "Key": "CAMBIAR-clave-de-desarrollo-de-al-menos-32-caracteres"
  },
  "TrustedWeb": {
    "Key": "dev-only-trusted-web-key-0123456789abcdef"
  },
  "Admin": {
    "Email": "admin@coldcup.local",
    "Password": "CAMBIAR"
  },
  "Cloudinary": {
    "CloudName": "",
    "ApiKey": "",
    "ApiSecret": ""
  }
}
```

`TrustedWeb:Key` debe ser igual a `API_TRUSTED_KEY` en `web/.env.local`. Sin credenciales de Cloudinary la subida de fotos queda deshabilitada. El resto de los valores (`Jwt:Issuer`, `Jwt:ExpiresHours`, `Cors:Origins`, `Cloudinary:Folder`) tiene defaults en `appsettings.json`.

### Seed inicial

- Categoría **Huevos** con la presentación Cajón (360), Medio cajón (180) y Maple (30).
- Productos **Huevos N°1** y **Huevos N°2**, con precio minorista por presentación; el mayorista queda a cargar desde el panel.
- Settings: umbral mayorista (100) y número de WhatsApp; usuario admin con `Admin:Email` / `Admin:Password`.

El catálogo inicial solo se carga si la base todavía no tiene catálogo: una vez que se administra desde el panel, volver a correr `seed` no lo toca. Los settings y el usuario admin se crean solo si faltan.

Para recuperar el acceso al panel sin correr el seed: `Admin__Email=... Admin__Password=... dotnet run --project src/AccFenix.Api -- reset-admin` (en producción, `dotnet AccFenix.Api.dll reset-admin`). Crea el admin si no existe o le reemplaza la contraseña (mínimo 8 caracteres); no aplica migraciones ni toca el catálogo, los settings ni otros usuarios. Los tokens ya emitidos siguen siendo válidos hasta que vencen.

## Tests

```bash
cd api && dotnet test      # unitarios + integración; levanta Postgres con Testcontainers (requiere Docker)

# Sin Docker: usar un Postgres existente (el usuario necesita permiso CREATEDB; se crea y borra una base temporal)
ACCFENIX_TEST_DB="Host=localhost;Port=5433;Database=postgres;Username=...;Password=..." dotnet test

cd web && npm test         # vitest
```

Los tests de seguridad (inyección SQL, autorización, validación de entradas) están en `SecurityTests.cs`.

La CI (`.github/workflows/ci.yml`) corre en cada push y pull request: en `web/` lint, typecheck, tests y build; en `api/` los tests contra un servicio de Postgres usando `ACCFENIX_TEST_DB`.

## Configuración de la API

Variables de entorno (formato ASP.NET, `__` separa secciones):

| Variable | Descripción |
| --- | --- |
| `ConnectionStrings__Default` | Cadena de conexión de PostgreSQL |
| `Jwt__Key` | Clave de firma de al menos 32 caracteres |
| `Cors__Origins__0` | Origen del sitio web (p. ej. `https://tu-dominio.com`) |
| `Admin__Email`, `Admin__Password` | Usuario admin que crea el seed (solo si no existe) o que crea/restablece `reset-admin` |
| `TrustedWeb__Key` | Clave compartida con la web (mínimo 32 caracteres, igual a `API_TRUSTED_KEY`). Hace que el límite de intentos de login sea por visitante; sin ella el cupo es compartido |
| `Cloudinary__CloudName`, `Cloudinary__ApiKey`, `Cloudinary__ApiSecret` | Cuenta para fotos y videos. Sin estas variables, la subida queda deshabilitada |

Migraciones nuevas: `dotnet ef migrations add <Nombre> --project src/AccFenix.Api -o Data/Migrations`.

Script SQL idempotente con todas las migraciones (para aplicar a mano en producción con `psql "$DATABASE_URL" -f api/db/migrations.sql`): `api/db/migrations.sql`. Regenerarlo tras cada migración nueva con `dotnet ef migrations script --idempotent --project src/AccFenix.Api -o db/migrations.sql` (desde `api/`) y volver a agregar el encabezado.

## Deploy sugerido

- **Web**: Vercel. Configurar `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BRAND_NAME` y `API_TRUSTED_KEY` (el mismo valor que `TrustedWeb__Key` en la API). Las páginas de catálogo y producto se generan en el primer pedido y se cachean (revalidación de 60 s; los cambios desde el panel las invalidan).
- **API + Postgres**: Railway, Render o Fly.io. Ejecutar `dotnet AccFenix.Api.dll seed` una vez después del primer deploy (aplica las migraciones).
  - La imagen se construye con `api/Dockerfile`. En Render: servicio de tipo Docker con **Root Directory** `api`; el contenedor escucha en el `PORT` que inyecta la plataforma (8080 si no está definido).
  - Desplegar **una sola instancia** de la API: el bloqueo de login y los límites de frecuencia (rate limits) se guardan en memoria, así que con varias instancias cada una llevaría su propia cuenta (haría falta un almacén compartido, p. ej. Redis). Reiniciar la API borra los bloqueos vigentes.
- La sesión admin es una cookie httpOnly en el dominio del sitio; el navegador nunca ve el JWT.
- El número de WhatsApp y el umbral mayorista se configuran desde el panel (Configuración); las fotos y videos, desde Productos.
