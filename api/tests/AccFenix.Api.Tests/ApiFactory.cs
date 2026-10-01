using AccFenix.Api.Data;
using AccFenix.Api.Seed;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Testcontainers.PostgreSql;

namespace AccFenix.Api.Tests;

/// <summary>
/// Levanta la API contra un Postgres efímero, migrado y con el seed aplicado.
/// Por defecto usa Testcontainers (requiere Docker). Si está definida ACCFENIX_TEST_DB
/// (cadena de conexión a un servidor con permiso CREATEDB), crea una base temporal ahí y la borra al terminar.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminEmail = "admin@test.local";
    public const string AdminPassword = "test-password-123";
    public const string TrustedWebKey = "test-trusted-web-key-0123456789abcdef";

    static readonly string? ExternalServer = Environment.GetEnvironmentVariable("ACCFENIX_TEST_DB");

    readonly PostgreSqlContainer? _container =
        ExternalServer is null ? new PostgreSqlBuilder().WithImage("postgres:16-alpine").Build() : null;
    readonly string _databaseName = $"accfenix_test_{Guid.NewGuid():N}";
    string _connectionString = "";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", _connectionString);
        builder.UseSetting("Jwt:Key", "test-key-0123456789abcdef0123456789abcdef");
        builder.UseSetting("TrustedWeb:Key", TrustedWebKey);
        builder.UseSetting("Admin:Email", AdminEmail);
        builder.UseSetting("Admin:Password", AdminPassword);
    }

    public async Task InitializeAsync()
    {
        if (_container is not null)
        {
            await _container.StartAsync();
            _connectionString = _container.GetConnectionString();
        }
        else
        {
            await using var conn = new NpgsqlConnection(ExternalServer);
            await conn.OpenAsync();
            await using (var cmd = new NpgsqlCommand($"CREATE DATABASE \"{_databaseName}\"", conn)) await cmd.ExecuteNonQueryAsync();
            _connectionString = new NpgsqlConnectionStringBuilder(ExternalServer) { Database = _databaseName }.ConnectionString;
        }

        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
        await scope.ServiceProvider.GetRequiredService<CatalogSeeder>().SeedAsync();
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        if (_container is not null)
        {
            await _container.DisposeAsync();
            return;
        }

        NpgsqlConnection.ClearAllPools();
        await using var conn = new NpgsqlConnection(ExternalServer);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{_databaseName}\" WITH (FORCE)", conn);
        await cmd.ExecuteNonQueryAsync();
    }
}

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
