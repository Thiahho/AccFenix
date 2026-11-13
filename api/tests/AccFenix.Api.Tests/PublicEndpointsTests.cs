using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AccFenix.Api.Data;
using AccFenix.Api.Seed;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

[Collection(ApiCollection.Name)]
public class PublicEndpointsTests(ApiFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Categories_lists_the_seeded_egg_catalog()
    {
        var json = await _client.GetFromJsonAsync<JsonElement>("/api/categories");

        json.EnumerateArray().Select(c => c.GetProperty("slug").GetString())
            .Should().Equal("huevos");
    }

    [Theory]
    [InlineData("huevos-n-1", 3)]   // Cajón, Medio cajón, Maple
    [InlineData("huevos-n-2", 3)]
    public async Task Product_detail_exposes_one_variant_per_combination(string slug, int expected)
    {
        var json = await _client.GetFromJsonAsync<JsonElement>($"/api/products/{slug}");

        json.GetProperty("variants").GetArrayLength().Should().Be(expected);
    }

    [Fact]
    public async Task Seed_totals_match_the_acta()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var byCategory = await db.Variants.Where(v => v.IsActive)
            .GroupBy(v => v.Product.Category.Slug)
            .ToDictionaryAsync(g => g.Key, g => g.Count());

        byCategory.Should().BeEquivalentTo(new Dictionary<string, int>
        {
            ["huevos"] = 6, // 2 productos × 3 presentaciones
        });
    }

    [Theory]
    [InlineData("huevos-n-1", "Cajón", 60000)]
    [InlineData("huevos-n-1", "Medio cajón", 35000)]
    [InlineData("huevos-n-1", "Maple", 6500)]
    [InlineData("huevos-n-2", "Cajón", 55000)]
    [InlineData("huevos-n-2", "Medio cajón", 27000)]
    [InlineData("huevos-n-2", "Maple", 5500)]
    public async Task Seeded_egg_variants_carry_retail_prices(string productSlug, string presentation, decimal retail)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var variant = await db.Variants
            .Where(v => v.IsActive && v.Product.Slug == productSlug)
            .SingleAsync(v => v.Values.Any(x => x.AttributeValue.Label == presentation));

        variant.RetailPrice.Should().Be(retail);
        variant.WholesalePrice.Should().BeNull();
    }

    [Fact]
    public async Task Seed_is_idempotent()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var before = await db.Variants.CountAsync();

        await scope.ServiceProvider.GetRequiredService<CatalogSeeder>().SeedAsync();

        (await db.Variants.CountAsync()).Should().Be(before);
    }

    [Theory]
    [InlineData("/api/categories")]
    [InlineData("/api/categories/huevos/products")]
    public async Task Catalog_listings_do_not_mention_prices(string url)
    {
        var body = await _client.GetStringAsync(url);

        body.Should().NotContainAny("price", "precio", "amount", "monto");
    }

    [Fact]
    public async Task Unknown_product_returns_404()
    {
        var res = await _client.GetAsync("/api/products/no-existe");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Variants_status_returns_availability_for_requested_ids()
    {
        var product = await _client.GetFromJsonAsync<JsonElement>("/api/products/huevos-n-1");
        var ids = product.GetProperty("variants").EnumerateArray().Take(2).Select(v => v.GetProperty("id").GetInt32()).ToList();

        var json = await _client.GetFromJsonAsync<JsonElement>($"/api/variants?ids={string.Join(',', ids)},999999");

        json.GetArrayLength().Should().Be(2);
        json[0].GetProperty("availability").GetString().Should().Be("disponible");
    }

    [Fact]
    public async Task Public_settings_expose_default_threshold()
    {
        var json = await _client.GetFromJsonAsync<JsonElement>("/api/settings/public");

        json.GetProperty("wholesaleThreshold").GetInt32().Should().Be(100);
    }
}
