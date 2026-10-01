# Imagen de la API. El contexto de build es la carpeta api/ (en Render: Root Directory = api).
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore en una capa aparte: solo se repite cuando cambian las dependencias.
COPY global.json ./
COPY src/AccFenix.Api/AccFenix.Api.csproj src/AccFenix.Api/
RUN dotnet restore src/AccFenix.Api/AccFenix.Api.csproj

COPY src/AccFenix.Api/ src/AccFenix.Api/
RUN dotnet publish src/AccFenix.Api/AccFenix.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app ./

# Render inyecta PORT (10000 por defecto); fuera de Render se usa 8080.
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["sh", "-c", "exec dotnet AccFenix.Api.dll --urls http://0.0.0.0:${PORT:-8080} \"$@\"", "--"]
