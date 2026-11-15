using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace AccFenix.Api.Tests;

/// <summary>
/// Product writes: SKU length with long names and labels, and atomicity of product + variant generation.
/// Every test works on its own throwaway catalog data and removes what it creates.
/// </summary>
[Collection(ApiCollection.Name)]
public class ProductWriteTests(ApiFactory factory)
{
    static HttpClient AdminClient(WebApplicationFactory<Program> app)
    {
        var token = app.AdminToken();
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    static async Task<int> CreatedId(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    [Fact]
    public async Task Product_with_long_name_and_labels_gets_variants_with_skus_within_the_column()
    {
        var admin = AdminClient(factory);
        var tag = Guid.NewGuid().ToString("N");
        var attrId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/attributes", new { name = $"attr-{tag}", sortOrder = 90 }));
        var valueIds = new List<int>();
        foreach (var letter in new[] { 'x', 'y' })
        {
            valueIds.Add(await CreatedId(await admin.PostAsJsonAsync($"/api/admin/attributes/{attrId}/values",
                new { label = $"{tag}-{new string(letter, 40)}", sortOrder = valueIds.Count })));
        }
        var categoryId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/categories",
            new { name = $"cat-{tag}", sortOrder = 50, isActive = true, attributeIds = new[] { attrId } }));

        // 160-char name (the validator's max): its slug alone exceeded the 120-char SKU column before the cap.
        var name = $"{tag}-{new string('n', 160 - tag.Length - 1)}";
        var productId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/products",
            new { categoryId, name, sortOrder = 0, isActive = true, allowedValueIds = valueIds }));

        try
        {
            var product = await admin.GetFromJsonAsync<JsonElement>($"/api/admin/products/{productId}");
            var skus = product.GetProperty("variants").EnumerateArray().Select(v => v.GetProperty("sku").GetString()!).ToList();

            skus.Should().HaveCount(2).And.OnlyHaveUniqueItems();
            skus.Should().OnlyContain(s => s.Length <= Variant.SkuMaxLength && s.StartsWith($"{productId}-"));
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/products/{productId}");
            await admin.DeleteAsync($"/api/admin/categories/{categoryId}");
            await admin.DeleteAsync($"/api/admin/attributes/{attrId}");
        }
    }

    [Fact]
    public async Task Failed_variant_generation_leaves_no_product()
    {
        await using var failing = factory.WithWebHostBuilder(b =>
            b.ConfigureTestServices(s => s.AddScoped<VariantGenerator, FailingVariantGenerator>()));
        var admin = AdminClient(failing);
        var tag = Guid.NewGuid().ToString("N");
        var categoryId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/categories",
            new { name = $"cat-{tag}", sortOrder = 50, isActive = true, attributeIds = Array.Empty<int>() }));

        try
        {
            var res = await admin.PostAsJsonAsync("/api/admin/products",
                new { categoryId, name = $"prod-{tag}", sortOrder = 0, isActive = true, allowedValueIds = Array.Empty<int>() });

            res.StatusCode.Should().Be(HttpStatusCode.Conflict, await res.Content.ReadAsStringAsync());
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Products.AnyAsync(p => p.Slug == $"prod-{tag}")).Should().BeFalse();
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/categories/{categoryId}");
        }
    }

    /// <summary>Simulates a SKU unique violation hit while generating variants (mapped to 409 by the endpoint filter).</summary>
    sealed class FailingVariantGenerator(AppDbContext db) : VariantGenerator(db)
    {
        public override Task<GenerateResult> GenerateAsync(int productId, CancellationToken ct = default) =>
            throw new DbUpdateException("simulated",
                new PostgresException("duplicate key value", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation));
    }
}
