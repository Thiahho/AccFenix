# Auditoría de seguridad — AccFenix

Fecha: 2026-10-01 · Rama: `feat/catalogo-mvp`

## Alcance y método

Revisión manual de código de:

- **API** (`api/src/AccFenix.Api`): endpoints públicos, de autenticación y de administración, validadores,
  acceso a datos, emisión de JWT, integración con Cloudinary y configuración de arranque.
- **Web, capa servidor** (`web/`): rutas `app/api/geo/*`, acciones de servidor del panel
  (`app/admin/actions.ts`), sesión (`lib/admin/session.ts`), `middleware.ts`, esquema del pedido
  (`lib/order.ts`) y armado del link de WhatsApp (`lib/whatsapp.ts`).

Cada hallazgo se verificó leyendo el código y, cuando se corrigió, con un test automatizado. No se hicieron
pruebas contra el entorno de producción ni análisis de dependencias.

## Inyección SQL

**No se encontró ningún punto inyectable.**

- Todo el acceso a datos usa EF Core con LINQ, que envía los valores como parámetros. No hay
  `FromSqlRaw`, `ExecuteSqlRaw`, `SqlQueryRaw` ni SQL armado con texto en `api/src`.
- El único SQL escrito a mano está en el fixture de tests (`ApiFactory.cs`) y usa un nombre de base generado
  con un GUID, sin datos externos.
- La web no accede a la base: solo llama a la API.

Para que esto se mantenga, se agregaron:

- Tests de regresión con payloads de inyección contra los endpoints públicos, el login y el panel
  (`SecurityTests.cs`): responden 404/400/401, nunca 500, y la cantidad de productos, variantes y usuarios no cambia.
- Un test que recorre el código fuente y falla si aparece una API de SQL crudo
  (`Source_code_has_no_raw_sql`).
- Los slugs públicos ahora se validan por formato (`[a-z0-9-]`, hasta 180 caracteres) antes de consultar la base.

## Hallazgos

| # | Severidad | Hallazgo | Estado |
|---|-----------|----------|--------|
| 1 | Media | Los enums aceptaban enteros arbitrarios (`"availability": 99`) y `PATCH /api/admin/variants/{id}` no tenía validador: se guardaba un valor inválido que salía por la API pública | Corregido |
| 2 | Media | Un nombre sin letras ni números (`"!!!"`) generaba un slug vacío y se guardaba | Corregido |
| 3 | Media | El límite de intentos de login se cuenta por la IP que ve la API, y esa IP es la del servidor de la web: el cupo (10 intentos cada 5 minutos) era compartido por todos, y cualquiera podía agotarlo y bloquear al admin | Corregido (requiere configurar la clave compartida) |
| 4 | Baja | Sin tope de largo o tamaño: descripción de categoría, email y contraseña del login, listas de ids, `sortOrder` | Corregido |
| 5 | Baja | El `publicId` de una foto no se comparaba con su URL: se podía registrar un `publicId` ajeno y, al borrar la foto, eliminar otro archivo de la cuenta de Cloudinary (requiere sesión admin) | Corregido |
| 6 | Baja | Dos altas simultáneas con el mismo slug o label terminaban en error 500 | Corregido |
| 7 | Baja | El login respondía más rápido cuando el email no existía, lo que permite deducir el email del admin | Corregido |
| 8 | Baja | La web no enviaba cabeceras de seguridad | Corregido (sin CSP) |
| 9 | Baja | La ubicación del pedido aceptaba latitud y longitud fuera de rango | Corregido |
| 10 | Baja | Texto con el carácter nulo (`\u0000`) en nombres o descripciones provocaba error 500 al guardar | Corregido |
| 11 | Info | `appsettings.Development.json` está versionado con la contraseña de la base local, la clave JWT de desarrollo y la contraseña `admin1234` | Recomendación |
| 12 | Info | Las rutas `/api/geo/*` son proxies públicos sin límite de uso | Recomendación |
| 13 | Info | Cerrar sesión borra la cookie pero no invalida el JWT, que sigue siendo válido hasta 12 horas | Recomendación |
| 14 | Info | No hay Content-Security-Policy | Recomendación |

### Detalle de lo corregido

1. **Enums** — `Program.cs`: `JsonStringEnumConverter(..., allowIntegerValues: false)`. Nuevo
   `VariantPatchRequestValidator` en `Endpoints/AdminCatalogEndpoints.cs`.
2. **Slug vacío** — regla `ProducesSlug` (`Endpoints/Validation.cs`) en los validadores de categoría,
   atributo y producto.
3. **Límite de login por visitante** — la web reenvía la IP del visitante (`web/lib/admin/client-ip.ts`) junto
   con una clave compartida, y la API cuenta los intentos por esa IP solo si la clave coincide
   (`Services/ClientIp.cs`; en IPv6, por prefijo /64). Los intentos fallidos de un visitante ya no bloquean
   al admin. Hay que definir la misma clave en `TrustedWeb__Key` (API) y `API_TRUSTED_KEY` (web); sin ella
   el cupo sigue siendo compartido. Supone que la web está detrás de un proxy que fija `x-real-ip` /
   `x-forwarded-for` (Vercel lo hace); expuesta directamente, un atacante podría falsear esa cabecera para
   conseguir cupos nuevos.
4. **Topes** — `Endpoints/Validation.cs` agrega `SingleLine`, `FreeText`, `ValidSortOrder` e `IdList`;
   se aplican en `AdminCatalogEndpoints.cs`, `AdminMediaEndpoints.cs` y `AuthEndpoints.cs`
   (email y contraseña hasta 200 caracteres; listas de 50/500 ids; `sortOrder` entre ±100 000).
5. **Cloudinary** — `MediaUrl.HasPublicId` (`Services/MediaStorage.cs`) exige que la URL registrada sea la
   de ese `publicId`.
6. **Duplicados** — `UniqueViolationFilter` (`Endpoints/Validation.cs`) en el grupo `/api/admin` convierte
   la violación de índice único de Postgres en 409.
7. **Tiempo del login** — `AuthEndpoints.cs` verifica contra un hash fijo cuando el usuario no existe.
8. **Cabeceras** — `web/next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
   `Referrer-Policy`, `Permissions-Policy`.
9. **Coordenadas** — `web/lib/order.ts`.
10. **Carácter nulo** — cubierto por `SingleLine` y `FreeText`.

### Recomendaciones sin cambio de código

- **11 — Secretos de desarrollo.** Son solo para el entorno local, pero conviene que producción no reutilice
  ninguno: definir `Jwt__Key`, `Admin__Password` y la cadena de conexión por variables de entorno, y usar una
  contraseña de admin larga.
- **12 — Rutas geo.** Las entradas están acotadas (largo máximo, coordenadas validadas, solo dominios de
  Google en el resolvedor de links), pero sin límite de uso alguien puede consumir la cuota de los servicios
  externos.
- **13 — Sesión.** Si se necesita cortar una sesión antes de las 12 horas hay que rotar `Jwt__Key`
  (invalida todas) o guardar una lista de tokens revocados.
- **14 — CSP.** Requiere nonces para los scripts inline de Next; es un cambio aparte.

## Controles revisados que ya estaban bien

- JWT firmado con HS256, clave de al menos 32 caracteres validada al arrancar, emisor y audiencia definidos.
- Todas las rutas `/api/admin/*` exigen autorización (ahora verificado por test sobre la tabla de rutas).
- Contraseñas guardadas con `PasswordHasher` de ASP.NET Identity.
- Cookie de sesión `httpOnly`, `secure` en producción y `sameSite=lax`; el navegador nunca ve el JWT.
- Solo se registran URLs de la cuenta propia de Cloudinary (`IsOwnUrl`).
- El resolvedor de links de Maps solo sigue redirecciones a dominios de Google por HTTPS (con tests).
- El texto del pedido se codifica completo dentro del parámetro `text` del link de WhatsApp.
- CORS limitado a una lista de orígenes; los errores no exponen trazas.

## Tests agregados

- `api/tests/AccFenix.Api.Tests/SecurityTests.cs`: inyección SQL (endpoints públicos, login, panel), guard de
  SQL crudo, autorización de todas las rutas admin, tokens ausentes o falsificados, validación de entradas,
  duplicados, slugs mal formados, `publicId` de media.
- `web/lib/order.test.ts`: campos obligatorios, largos máximos, zonas y provincias válidas, coordenadas.
- `web/lib/whatsapp.test.ts`: el texto del cliente no puede agregar parámetros al link.

```bash
cd api && dotnet test
cd web && npm test
```
