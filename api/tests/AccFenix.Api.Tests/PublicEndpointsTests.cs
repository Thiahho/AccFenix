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
    public async Task Categories_lists_the_seeded_menu()
    {
        var json = await _client.GetFromJsonAsync<JsonElement>("/api/categories");

        json.EnumerateArray().Select(c => c.GetProperty("slug").GetString())
            .Should().Equal("cafes-clasicos", "especiales", "refrescantes", "extras");
    }

    [Theory]
    [InlineData("latte-frio", 2)]   // Chico, Grande
    [InlineData("limonada-menta-y-jengibre", 2)]
    [InlineData("extra-leche-de-almendras", 2)]
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
            ["cafes-clasicos"] = 10, // 5 products × 2 sizes
            ["especiales"] = 8,      // 4 products × 2 sizes
            ["refrescantes"] = 2,    // 1 product × 2 sizes
            ["extras"] = 4,          // 2 products × 2 sizes
        });
    }

    [Theory]
    [InlineData("latte-frio", "Chico (500 cc)", 4500)]
    [InlineData("latte-frio", "Grande (700 cc)", 6000)]
    [InlineData("latte-frio-vainilla", "Chico (500 cc)", 5000)]
    [InlineData("latte-frio-vainilla", "Grande (700 cc)", 6500)]
    [InlineData("latte-frio-caramel", "Chico (500 cc)", 5500)]
    [InlineData("latte-frio-caramel", "Grande (700 cc)", 7000)]
    [InlineData("latte-frio-mocca", "Chico (500 cc)", 5000)]
    [InlineData("latte-frio-mocca", "Grande (700 cc)", 6500)]
    [InlineData("iced-americano", "Chico (500 cc)", 4000)]
    [InlineData("iced-americano", "Grande (700 cc)", 5500)]
    [InlineData("latte-frio-oreo", "Chico (500 cc)", 7500)]
    [InlineData("latte-frio-oreo", "Grande (700 cc)", 8200)]
    [InlineData("latte-frio-tiramisu", "Chico (500 cc)", 7900)]
    [InlineData("latte-frio-tiramisu", "Grande (700 cc)", 8500)]
    [InlineData("latte-frio-banana-cream", "Chico (500 cc)", 7500)]
    [InlineData("latte-frio-banana-cream", "Grande (700 cc)", 8200)]
    [InlineData("latte-frio-cookies-and-cream", "Chico (500 cc)", 7500)]
    [InlineData("latte-frio-cookies-and-cream", "Grande (700 cc)", 8500)]
    [InlineData("limonada-menta-y-jengibre", "Chico (500 cc)", 5500)]
    [InlineData("limonada-menta-y-jengibre", "Grande (700 cc)", 6500)]
    [InlineData("extra-leche-de-almendras", "Chico (500 cc)", 1000)]
    [InlineData("extra-leche-de-almendras", "Grande (700 cc)", 1000)]
    [InlineData("extra-leche-deslactosada", "Chico (500 cc)", 500)]
    [InlineData("extra-leche-deslactosada", "Grande (700 cc)", 500)]
    public async Task Seeded_menu_variants_carry_retail_prices(string productSlug, string size, decimal retail)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var variant = await db.Variants
            .Where(v => v.IsActive && v.Product.Slug == productSlug)
            .SingleAsync(v => v.Values.Any(x => x.AttributeValue.Label == size));

        variant.RetailPrice.Should().Be(retail);
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
    [InlineData("/api/categories/cafes-clasicos/products")]
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
        var product = await _client.GetFromJsonAsync<JsonElement>("/api/products/latte-frio");
        var ids = product.GetProperty("variants").EnumerateArray().Take(2).Select(v => v.GetProperty("id").GetInt32()).ToList();

        var json = await _client.GetFromJsonAsync<JsonElement>($"/api/variants?ids={string.Join(',', ids)},999999");

        json.GetArrayLength().Should().Be(2);
        json[0].GetProperty("availability").GetString().Should().Be("disponible");
    }

    [Fact]
    public async Task Public_settings_expose_the_default_whatsapp_number()
    {
        var json = await _client.GetFromJsonAsync<JsonElement>("/api/settings/public");

        json.GetProperty("whatsappNumber").GetString().Should().Be("5491122692061");
        json.TryGetProperty("wholesaleThreshold", out _).Should().BeFalse();
    }
}
