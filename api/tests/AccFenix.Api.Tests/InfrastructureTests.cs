using System.Net;
using AccFenix.Api.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

[Collection(ApiCollection.Name)]
public class InfrastructureTests(ApiFactory factory)
{
    /// <summary>Fails when the model changed without a migration (run <c>dotnet ef migrations add</c>).</summary>
    [Fact]
    public void Model_has_no_pending_changes()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Database.HasPendingModelChanges().Should().BeFalse();
    }

    /// <summary>Fails when a migration was added without regenerating <c>api/db/migrations.sql</c> (see README).</summary>
    [Fact]
    public void Migrations_script_contains_every_migration()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrations = db.Database.GetMigrations().ToList();
        var script = File.ReadAllText(Path.Combine(SecurityTests.ApiRoot(), "db", "migrations.sql"));

        migrations.Should().NotBeEmpty();
        // The idempotent script records each migration with: VALUES ('<MigrationId>', '<ProductVersion>');
        migrations.Where(id => !script.Contains($"VALUES ('{id}', ", StringComparison.Ordinal))
            .Should().BeEmpty("api/db/migrations.sql must be regenerated after adding a migration");
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/health/ready")]
    public async Task Health_endpoints_report_healthy(string url)
    {
        var res = await factory.CreateClient().GetAsync(url);

        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
    }
}
