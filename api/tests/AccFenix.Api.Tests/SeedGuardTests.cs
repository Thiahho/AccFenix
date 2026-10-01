using AccFenix.Api.Data;
using AccFenix.Api.Seed;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

/// <summary>Usa su propia base (fuera de la colección "api") porque modifica el catálogo sembrado.</summary>
public class SeedGuardTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Seed_does_not_restore_catalog_removed_from_db()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var removed = await db.Products.SingleAsync(p => p.Slug == "terminales");
        db.Products.Remove(removed);
        await db.SaveChangesAsync();
        var products = await db.Products.CountAsync();
        var variants = await db.Variants.CountAsync();

        await scope.ServiceProvider.GetRequiredService<CatalogSeeder>().SeedAsync();

        (await db.Products.AnyAsync(p => p.Slug == "terminales")).Should().BeFalse();
        (await db.Products.CountAsync()).Should().Be(products);
        (await db.Variants.CountAsync()).Should().Be(variants);
    }
}
