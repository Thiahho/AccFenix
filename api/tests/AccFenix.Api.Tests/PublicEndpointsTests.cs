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
    public async Task Categories_lists_the_three_seeded_catalogs_in_order()
    {
        var json = await _client.GetFromJsonAsync<JsonElement>("/api/categories");

        json.EnumerateArray().Select(c => c.GetProperty("slug").GetString())
            .Should().Equal("barrales", "accesorios", "kits");
    }

    [Theory]
    [InlineData("barral", 60)]          // 10 medidas × 2 grosores × 3 colores
    [InlineData("soporte-bocha", 6)]    // 2 grosores × 3 colores
    [InlineData("kit-1-20-a-1-60-simple", 18)]  // 3 medidas × 2 × 3
    [InlineData("kit-1-80-a-3-00-doble", 42)]   // 7 medidas × 2 × 3
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
            ["barrales"] = 60,
            ["accesorios"] = 30,
            ["kits"] = 120, // (3 + 3 + 7 + 7) medidas × 6
        });
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
    [InlineData("/api/categories/barrales/products")]
    [InlineData("/api/products/barral")]
    public async Task Public_payloads_never_mention_prices(string url)
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
        var product = await _client.GetFromJsonAsync<JsonElement>("/api/products/argollas");
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
