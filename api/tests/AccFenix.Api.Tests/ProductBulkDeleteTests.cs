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
/// Bulk product delete. Every test works on its own throwaway category and products and removes what is left,
/// so the seeded catalog other tests rely on stays untouched.
/// </summary>
[Collection(ApiCollection.Name)]
public class ProductBulkDeleteTests(ApiFactory factory)
{
    const string Url = "/api/admin/products/bulk-delete";
    readonly HttpClient _public = factory.CreateClient();

    HttpClient AdminClient()
    {
        var token = factory.AdminToken();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    static async Task<int> CreatedId(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    sealed record TestCatalog(HttpClient Admin, int CategoryId, List<int> ProductIds) : IAsyncDisposable
    {
        public async Task<HttpStatusCode> Status(int productId) => (await Admin.GetAsync($"/api/admin/products/{productId}")).StatusCode;

        public async ValueTask DisposeAsync()
        {
            foreach (var id in ProductIds) await Admin.DeleteAsync($"/api/admin/products/{id}");
            await Admin.DeleteAsync($"/api/admin/categories/{CategoryId}");
        }
    }

    async Task<TestCatalog> CreateProducts(int count)
    {
        var admin = AdminClient();
        var slug = $"bulk-delete-{Guid.NewGuid():N}";
        var categoryId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/categories",
            new { name = $"cat-{slug}", sortOrder = 50, isActive = true, attributeIds = Array.Empty<int>() }));
        var ids = new List<int>();
        for (var i = 0; i < count; i++)
        {
            ids.Add(await CreatedId(await admin.PostAsJsonAsync("/api/admin/products",
                new { categoryId, name = $"{slug}-{i}", sortOrder = 0, isActive = true, allowedValueIds = Array.Empty<int>() })));
        }
        return new TestCatalog(admin, categoryId, ids);
    }

    [Fact]
    public async Task Requires_a_token()
    {
        var res = await _public.PostAsJsonAsync(Url, new { ids = new[] { 1 } });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Deletes_every_listed_product()
    {
        await using var catalog = await CreateProducts(3);
        var toDelete = catalog.ProductIds.Take(2).ToArray();

        var res = await catalog.Admin.PostAsJsonAsync(Url, new { ids = toDelete });

        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
        (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("deleted").GetInt32().Should().Be(2);
        (await catalog.Status(toDelete[0])).Should().Be(HttpStatusCode.NotFound);
        (await catalog.Status(toDelete[1])).Should().Be(HttpStatusCode.NotFound);
        (await catalog.Status(catalog.ProductIds[2])).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Duplicated_ids_are_counted_once()
    {
        await using var catalog = await CreateProducts(1);
        var id = catalog.ProductIds[0];

        var res = await catalog.Admin.PostAsJsonAsync(Url, new { ids = new[] { id, id } });

        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
        (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("deleted").GetInt32().Should().Be(1);
        (await catalog.Status(id)).Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task An_unknown_id_rejects_the_whole_request_and_deletes_nothing()
    {
        await using var catalog = await CreateProducts(2);

        var res = await catalog.Admin.PostAsJsonAsync(Url, new { ids = catalog.ProductIds.Append(int.MaxValue).ToArray() });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        foreach (var id in catalog.ProductIds) (await catalog.Status(id)).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task An_empty_list_is_rejected()
    {
        var res = await AdminClient().PostAsJsonAsync(Url, new { ids = Array.Empty<int>() });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task A_missing_list_is_rejected()
    {
        var res = await AdminClient().PostAsJsonAsync(Url, new { });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Non_positive_ids_are_rejected()
    {
        var res = await AdminClient().PostAsJsonAsync(Url, new { ids = new[] { 0, -1 } });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Too_many_ids_are_rejected()
    {
        var res = await AdminClient().PostAsJsonAsync(Url, new { ids = Enumerable.Range(1, 501).ToArray() });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
