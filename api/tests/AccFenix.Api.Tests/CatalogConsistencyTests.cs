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

namespace AccFenix.Api.Tests;

/// <summary>
/// Deletes that survive a storage failure, price exposure of hidden variants, the variant PATCH response and
/// allowed values left behind by category changes. Every test works on its own throwaway catalog data.
/// </summary>
[Collection(ApiCollection.Name)]
public class CatalogConsistencyTests(ApiFactory factory)
{
    readonly HttpClient _public = factory.CreateClient();

    static HttpClient AdminClient(WebApplicationFactory<Program> app)
    {
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", app.AdminToken());
        return client;
    }

    static async Task<int> CreatedId(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    static async Task<int> CreateCategory(HttpClient admin, string tag, params int[] attributeIds) =>
        await CreatedId(await admin.PostAsJsonAsync("/api/admin/categories", new { name = $"cat-{tag}", sortOrder = 50, isActive = true, attributeIds }));

    static async Task<int> CreateProduct(HttpClient admin, int categoryId, string name, params int[] allowedValueIds) =>
        await CreatedId(await admin.PostAsJsonAsync("/api/admin/products", new { categoryId, name, sortOrder = 0, isActive = true, allowedValueIds }));

    static async Task<JsonElement> Product(HttpClient admin, int id) => await admin.GetFromJsonAsync<JsonElement>($"/api/admin/products/{id}");

    async Task AddStoredMedia(int productId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Media.Add(new Media
        {
            ProductId = productId, Type = MediaType.Image, SortOrder = 0,
            Url = "https://res.cloudinary.com/demo/image/upload/v1/accfenix/x.jpg", CloudinaryPublicId = "accfenix/x",
        });
        await db.SaveChangesAsync();
    }

    async Task<bool> ProductExists(int id)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Products.AnyAsync(p => p.Id == id);
    }

    WebApplicationFactory<Program> WithFailingStorage() =>
        factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<IMediaStorage, FailingMediaStorage>()));

    // ---- Deletes: database first, storage best effort ----

    [Fact]
    public async Task Product_delete_succeeds_when_storage_fails()
    {
        await using var app = WithFailingStorage();
        var admin = AdminClient(app);
        var tag = Guid.NewGuid().ToString("N");
        var categoryId = await CreateCategory(admin, tag);
        var productId = await CreateProduct(admin, categoryId, $"prod-{tag}");
        await AddStoredMedia(productId);

        try
        {
            (await admin.DeleteAsync($"/api/admin/products/{productId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
            (await ProductExists(productId)).Should().BeFalse();
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/products/{productId}");
            await admin.DeleteAsync($"/api/admin/categories/{categoryId}");
        }
    }

    [Fact]
    public async Task Bulk_delete_succeeds_when_storage_fails()
    {
        await using var app = WithFailingStorage();
        var admin = AdminClient(app);
        var tag = Guid.NewGuid().ToString("N");
        var categoryId = await CreateCategory(admin, tag);
        var ids = new[] { await CreateProduct(admin, categoryId, $"a-{tag}"), await CreateProduct(admin, categoryId, $"b-{tag}") };
        foreach (var id in ids) await AddStoredMedia(id);

        try
        {
            var res = await admin.PostAsJsonAsync("/api/admin/products/bulk-delete", new { ids });

            res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
            foreach (var id in ids) (await ProductExists(id)).Should().BeFalse();
        }
        finally
        {
            foreach (var id in ids) await admin.DeleteAsync($"/api/admin/products/{id}");
            await admin.DeleteAsync($"/api/admin/categories/{categoryId}");
        }
    }

    [Fact]
    public async Task Media_delete_succeeds_when_storage_fails()
    {
        await using var app = WithFailingStorage();
        var admin = AdminClient(app);
        var tag = Guid.NewGuid().ToString("N");
        var categoryId = await CreateCategory(admin, tag);
        var productId = await CreateProduct(admin, categoryId, $"prod-{tag}");
        await AddStoredMedia(productId);

        try
        {
            var mediaId = (await Product(admin, productId)).GetProperty("media")[0].GetProperty("id").GetInt32();

            (await admin.DeleteAsync($"/api/admin/media/{mediaId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
            (await Product(admin, productId)).GetProperty("media").GetArrayLength().Should().Be(0);
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/products/{productId}");
            await admin.DeleteAsync($"/api/admin/categories/{categoryId}");
        }
    }

    // ---- Public variant status ----

    [Fact]
    public async Task Variant_status_hides_prices_of_variants_that_are_not_visible()
    {
        var admin = AdminClient(factory);
        var tag = Guid.NewGuid().ToString("N");
        var categoryId = await CreateCategory(admin, tag);
        var productId = await CreateProduct(admin, categoryId, $"prod-{tag}");

        try
        {
            var variantId = (await Product(admin, productId)).GetProperty("variants")[0].GetProperty("id").GetInt32();
            (await admin.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { retailPrice = 1500m }))
                .StatusCode.Should().Be(HttpStatusCode.OK);

            var visible = (await _public.GetFromJsonAsync<JsonElement>($"/api/variants?ids={variantId}"))[0];
            visible.GetProperty("isActive").GetBoolean().Should().BeTrue();
            visible.GetProperty("retailPrice").GetDecimal().Should().Be(1500m);

            (await admin.PutAsJsonAsync($"/api/admin/products/{productId}",
                new { categoryId, name = $"prod-{tag}", sortOrder = 0, isActive = false, allowedValueIds = Array.Empty<int>() }))
                .StatusCode.Should().Be(HttpStatusCode.OK);

            var hidden = (await _public.GetFromJsonAsync<JsonElement>($"/api/variants?ids={variantId}"))[0];
            hidden.GetProperty("isActive").GetBoolean().Should().BeFalse();
            hidden.GetProperty("retailPrice").ValueKind.Should().Be(JsonValueKind.Null);
            hidden.TryGetProperty("wholesalePrice", out _).Should().BeFalse();
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/products/{productId}");
            await admin.DeleteAsync($"/api/admin/categories/{categoryId}");
        }
    }

    // ---- Variant PATCH and category attribute changes ----

    async Task<(int AttributeId, int ValueId)> CreateAttribute(HttpClient admin, string name)
    {
        var attributeId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/attributes", new { name, sortOrder = 50 }));
        var valueId = await CreatedId(await admin.PostAsJsonAsync($"/api/admin/attributes/{attributeId}/values", new { label = "uno", sortOrder = 0 }));
        return (attributeId, valueId);
    }

    [Fact]
    public async Task Variant_patch_returns_the_variant_value_ids()
    {
        var admin = AdminClient(factory);
        var tag = Guid.NewGuid().ToString("N");
        var (attributeId, valueId) = await CreateAttribute(admin, $"attr-{tag}");
        var categoryId = await CreateCategory(admin, tag, attributeId);
        var productId = await CreateProduct(admin, categoryId, $"prod-{tag}", valueId);

        try
        {
            var variantId = (await Product(admin, productId)).GetProperty("variants")[0].GetProperty("id").GetInt32();

            var res = await admin.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { availability = "aPedido" });

            res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
            var valueIds = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("valueIds").EnumerateArray().Select(v => v.GetInt32());
            valueIds.Should().Equal(valueId);
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/products/{productId}");
            await admin.DeleteAsync($"/api/admin/categories/{categoryId}");
            await admin.DeleteAsync($"/api/admin/attributes/{attributeId}");
        }
    }

    [Fact]
    public async Task Removing_an_attribute_from_a_category_removes_its_values_from_the_products()
    {
        var admin = AdminClient(factory);
        var tag = Guid.NewGuid().ToString("N");
        var (keptId, keptValue) = await CreateAttribute(admin, $"kept-{tag}");
        var (droppedId, droppedValue) = await CreateAttribute(admin, $"dropped-{tag}");
        var categoryId = await CreateCategory(admin, tag, keptId, droppedId);
        var productId = await CreateProduct(admin, categoryId, $"prod-{tag}", keptValue, droppedValue);

        try
        {
            (await admin.PutAsJsonAsync($"/api/admin/categories/{categoryId}",
                new { name = $"cat-{tag}", sortOrder = 50, isActive = true, attributeIds = new[] { keptId } }))
                .StatusCode.Should().Be(HttpStatusCode.NoContent);

            var allowed = (await Product(admin, productId)).GetProperty("allowedValueIds").EnumerateArray().Select(v => v.GetInt32());
            allowed.Should().Equal(keptValue);
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/products/{productId}");
            await admin.DeleteAsync($"/api/admin/categories/{categoryId}");
            await admin.DeleteAsync($"/api/admin/attributes/{keptId}");
            await admin.DeleteAsync($"/api/admin/attributes/{droppedId}");
        }
    }

    /// <summary>A configured storage whose deletes always fail, as when Cloudinary is unreachable.</summary>
    sealed class FailingMediaStorage : IMediaStorage
    {
        public bool IsConfigured => true;
        public UploadSignature SignUpload() => throw new NotSupportedException();
        public Task DeleteAsync(string publicId, MediaType type, CancellationToken ct) => throw new HttpRequestException("storage unreachable");
        public bool IsOwnUrl(string url) => true;
    }
}
