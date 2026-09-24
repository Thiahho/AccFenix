# AccFenix

Catálogo web de barrales, accesorios y kits (sin precios), con carrito y pedido por WhatsApp, y un panel de administración.

- `api/`: ASP.NET Core 8 Web API + EF Core + PostgreSQL
- `web/`: Next.js (App Router) + Tailwind + shadcn/ui
- `docs/acta.md`: propuesta de proyecto

## Desarrollo local

Requisitos: .NET 8 SDK, Node 20+, Docker.

```bash
# Base de datos
docker compose up -d

# API (http://localhost:5080)
cd api
dotnet tool restore
dotnet ef database update --project src/AccFenix.Api
dotnet run --project src/AccFenix.Api -- seed   # carga el catálogo inicial y el admin
dotnet run --project src/AccFenix.Api

# Web (http://localhost:3000)
cd web
cp .env.example .env.local
npm install
npm run dev
```

## Tests

```bash
cd api && dotnet test      # requiere Docker (Testcontainers)
cd web && npm run test
```
