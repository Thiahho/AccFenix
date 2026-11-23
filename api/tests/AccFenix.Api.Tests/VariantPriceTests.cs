using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

/// <summary>
/// Retail prices per variant. Every test works on its own throwaway product and removes it,
/// so the seeded catalog other tests rely on stays untouched.
/// </summary>
[Collection(ApiCollection.Name)]
public class VariantPriceTests(ApiFactory factory)
{
    readonly HttpClient _public = factory.CreateClient();

    /// <summary>Admin client with a directly issued token, so login attempts are not consumed.</summary>
    HttpClient AdminClient()
    {
        var token = factory.AdminToken();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    /// <summary>A product with one attribute and two values, hence two variants.</summary>
    sealed record TestProduct(HttpClient Admin, int AttributeId, int CategoryId, int ProductId, string Slug, int FirstValueId, int SecondValueId) : IAsyncDisposable
    {
        public string Name => Slug;

        public async Task<List<JsonElement>> AdminVariants() =>
            (await Admin.GetFromJsonAsync<JsonElement>($"/api/admin/products/{ProductId}")).GetProperty("variants").EnumerateArray().ToList();

        public async Task<List<int>> VariantIds() => (await AdminVariants()).Select(v => v.GetProperty("id").GetInt32()).ToList();

        public Task<HttpResponseMessage> SetAllowedValues(params int[] valueIds) =>
            Admin.PutAsJsonAsync($"/api/admin/products/{ProductId}", new { categoryId = CategoryId, name = Name, sortOrder = 0, isActive = true, allowedValueIds = valueIds });

        public Task<HttpResponseMessage> SetPrices(params object[] prices) =>
            Admin.PutAsJsonAsync($"/api/admin/products/{ProductId}/variants/prices", new { prices });

        public async ValueTask DisposeAsync()
        {
            await Admin.DeleteAsync($"/api/admin/products/{ProductId}");
            await Admin.DeleteAsync($"/api/admin/categories/{CategoryId}");
            await Admin.DeleteAsync($"/api/admin/attributes/{AttributeId}");
        }
    }

    static async Task<int> CreatedId(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    async Task<TestProduct> CreateProduct()
    {
        var admin = AdminClient();
        var slug = $"price-test-{Guid.NewGuid():N}";
        var attributeId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/attributes", new { name = $"attr-{slug}", sortOrder = 50 }));
        var first = await CreatedId(await admin.PostAsJsonAsync($"/api/admin/attributes/{attributeId}/values", new { label = "First", sortOrder = 0 }));
        var second = await CreatedId(await admin.PostAsJsonAsync($"/api/admin/attributes/{attributeId}/values", new { label = "Second", sortOrder = 1 }));
        var categoryId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/categories",
            new { name = $"cat-{slug}", sortOrder = 50, isActive = true, attributeIds = new[] { attributeId } }));
        var productId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/products",
            new { categoryId, name = slug, sortOrder = 0, isActive = true, allowedValueIds = new[] { first, second } }));
        return new TestProduct(admin, attributeId, categoryId, productId, slug, first, second);
    }

    static decimal? Price(JsonElement variant, string property) =>
        variant.GetProperty(property).ValueKind == JsonValueKind.Null ? null : variant.GetProperty(property).GetDecimal();

    [Theory]
    [InlineData("PATCH", "/api/admin/variants/1")]
    [InlineData("PUT", "/api/admin/products/1/variants/prices")]
    public async Task Price_endpoints_require_a_token(string method, string url)
    {
        var body = JsonContent.Create(new { retailPrice = 10, prices = new[] { new { variantId = 1, retailPrice = 10 } } });

        var res = await _public.SendAsync(new HttpRequestMessage(new HttpMethod(method), url) { Content = body });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Prices_are_null_by_default()
    {
        await using var product = await CreateProduct();

        var adminVariants = await product.AdminVariants();
        var publicVariants = (await _public.GetFromJsonAsync<JsonElement>($"/api/products/{product.Slug}")).GetProperty("variants").EnumerateArray().ToList();

        adminVariants.Should().HaveCount(2);
        publicVariants.Should().HaveCount(2);
        foreach (var variant in adminVariants.Concat(publicVariants))
        {
            Price(variant, "retailPrice").Should().BeNull();
            variant.TryGetProperty("wholesalePrice", out _).Should().BeFalse();
        }
    }

    [Fact]
    public async Task Admin_sets_reads_and_clears_prices_on_a_single_variant()
    {
        await using var product = await CreateProduct();
        var variantId = (await product.VariantIds())[0];

        var patch = await product.Admin.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { retailPrice = 1500.50m });
        patch.StatusCode.Should().Be(HttpStatusCode.OK, await patch.Content.ReadAsStringAsync());
        var patched = await patch.Content.ReadFromJsonAsync<JsonElement>();
        Price(patched, "retailPrice").Should().Be(1500.50m);

        var stored = (await product.AdminVariants()).Single(v => v.GetProperty("id").GetInt32() == variantId);
        Price(stored, "retailPrice").Should().Be(1500.50m);

        // Omitted price fields leave the stored prices unchanged.
        (await product.Admin.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { availability = "aPedido" })).EnsureSuccessStatusCode();
        stored = (await product.AdminVariants()).Single(v => v.GetProperty("id").GetInt32() == variantId);
        stored.GetProperty("availability").GetString().Should().Be("aPedido");
        Price(stored, "retailPrice").Should().Be(1500.50m);

        // An explicit null clears the price.
        (await product.Admin.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { retailPrice = (decimal?)null })).EnsureSuccessStatusCode();
        stored = (await product.AdminVariants()).Single(v => v.GetProperty("id").GetInt32() == variantId);
        Price(stored, "retailPrice").Should().BeNull();
    }

    [Fact]
    public async Task Bulk_update_sets_prices_for_several_variants()
    {
        await using var product = await CreateProduct();
        var ids = await product.VariantIds();

        var res = await product.SetPrices(
            new { variantId = ids[0], retailPrice = (decimal?)99999999.99m },
            new { variantId = ids[1], retailPrice = (decimal?)250m });

        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
        (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("updated").GetInt32().Should().Be(2);
        var variants = (await product.AdminVariants()).ToDictionary(v => v.GetProperty("id").GetInt32());
        Price(variants[ids[0]], "retailPrice").Should().Be(99999999.99m);
        Price(variants[ids[1]], "retailPrice").Should().Be(250m);
    }

    [Fact]
    public async Task Bulk_update_rejects_a_variant_of_another_product_and_changes_nothing()
    {
        await using var product = await CreateProduct();
        await using var other = await CreateProduct();
        var ownId = (await product.VariantIds())[0];
        var foreignId = (await other.VariantIds())[0];

        var res = await product.SetPrices(
            new { variantId = ownId, retailPrice = 10m },
            new { variantId = foreignId, retailPrice = 10m });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        foreach (var variant in (await product.AdminVariants()).Concat(await other.AdminVariants()))
        {
            Price(variant, "retailPrice").Should().BeNull();
        }
    }

    [Fact]
    public async Task Bulk_update_rejects_malformed_requests()
    {
        await using var product = await CreateProduct();
        var id = (await product.VariantIds())[0];

        (await product.SetPrices()).StatusCode.Should().Be(HttpStatusCode.BadRequest, "an empty list is not a price update");
        (await product.SetPrices(
            new { variantId = id, retailPrice = 10m },
            new { variantId = id, retailPrice = 20m })).StatusCode.Should().Be(HttpStatusCode.BadRequest, "a variant may appear only once");
        (await product.SetPrices(new { variantId = 0, retailPrice = 10m })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await product.Admin.PutAsJsonAsync("/api/admin/products/999999/variants/prices",
            new { prices = new[] { new { variantId = id, retailPrice = 10m } } })).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("-0.01")]
    [InlineData("10.999")]
    [InlineData("100000000")]
    public async Task Invalid_prices_are_rejected(string price)
    {
        await using var product = await CreateProduct();
        var id = (await product.VariantIds())[0];
        static StringContent Json(string body) => new(body, System.Text.Encoding.UTF8, "application/json");

        (await product.Admin.PatchAsync($"/api/admin/variants/{id}", Json($$"""{"retailPrice":{{price}}}"""))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await product.Admin.PutAsync($"/api/admin/products/{product.ProductId}/variants/prices",
            Json($$"""{"prices":[{"variantId":{{id}},"retailPrice":{{price}}}]}"""))).StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var stored = (await product.AdminVariants()).Single(v => v.GetProperty("id").GetInt32() == id);
        Price(stored, "retailPrice").Should().BeNull();
    }

    [Fact]
    public async Task Public_endpoints_expose_variant_prices()
    {
        await using var product = await CreateProduct();
        var ids = await product.VariantIds();
        (await product.SetPrices(new { variantId = ids[0], retailPrice = 320.5m })).EnsureSuccessStatusCode();

        var detail = await _public.GetFromJsonAsync<JsonElement>($"/api/products/{product.Slug}");
        var status = await _public.GetFromJsonAsync<JsonElement>($"/api/variants?ids={ids[0]},{ids[1]}");

        foreach (var variants in new[] { detail.GetProperty("variants"), status })
        {
            var byId = variants.EnumerateArray().ToDictionary(v => v.GetProperty("id").GetInt32());
            Price(byId[ids[0]], "retailPrice").Should().Be(320.5m);
            byId[ids[0]].TryGetProperty("wholesalePrice", out _).Should().BeFalse();
            Price(byId[ids[1]], "retailPrice").Should().BeNull();
            byId[ids[1]].TryGetProperty("wholesalePrice", out _).Should().BeFalse();
        }
    }

    [Fact]
    public async Task Prices_survive_variant_regeneration()
    {
        await using var product = await CreateProduct();
        var ids = await product.VariantIds();
        (await product.SetPrices(
            new { variantId = ids[0], retailPrice = 100m },
            new { variantId = ids[1], retailPrice = 200m })).EnsureSuccessStatusCode();

        // Dropping a value deactivates its variant; restoring it reactivates the same row.
        (await product.SetAllowedValues(product.FirstValueId)).EnsureSuccessStatusCode();
        (await product.AdminVariants()).Count(v => v.GetProperty("isActive").GetBoolean()).Should().Be(1);
        (await product.SetAllowedValues(product.FirstValueId, product.SecondValueId)).EnsureSuccessStatusCode();
        (await product.Admin.PostAsync($"/api/admin/products/{product.ProductId}/variants/generate", null)).EnsureSuccessStatusCode();

        var variants = (await product.AdminVariants()).ToDictionary(v => v.GetProperty("id").GetInt32());
        variants.Should().HaveCount(2);
        variants.Values.Should().OnlyContain(v => v.GetProperty("isActive").GetBoolean());
        Price(variants[ids[0]], "retailPrice").Should().Be(100m);
        Price(variants[ids[1]], "retailPrice").Should().Be(200m);
    }
}
