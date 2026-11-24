using System.Collections.Concurrent;
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

[Collection(ApiCollection.Name)]
public class AdminTestimonialTests(ApiFactory factory)
{
    const string OwnPrefix = "https://res.cloudinary.com/demo/image/upload/v1/accfenix/";

    readonly RecordingStorage _storage = new();

    /// <summary>
    /// The API with a storage that owns the "demo" cloud, so uploads are accepted. The token is issued directly,
    /// so these tests never spend login attempts of the per-visitor limiter.
    /// </summary>
    (WebApplicationFactory<Program> App, HttpClient Admin) AdminApp()
    {
        var app = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddSingleton<IMediaStorage>(_storage)));
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", app.AdminToken());
        return (app, client);
    }

    static object Upload(string name, string source = "instagram", string? caption = null) => new
    {
        url = $"{OwnPrefix}{name}.jpg", publicId = $"accfenix/{name}", source, caption, width = 1080, height = 1920,
    };

    static async Task<int> CreatedId(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    static async Task<List<int>> PublicIds(HttpClient client) =>
        (await client.GetFromJsonAsync<JsonElement>("/api/testimonials")).EnumerateArray().Select(t => t.GetProperty("id").GetInt32()).ToList();

    [Theory]
    [InlineData("GET", "/api/admin/testimonials")]
    [InlineData("POST", "/api/admin/testimonials")]
    [InlineData("PATCH", "/api/admin/testimonials/1")]
    [InlineData("DELETE", "/api/admin/testimonials/1")]
    public async Task Admin_testimonial_endpoints_require_a_token(string method, string url)
    {
        var res = await factory.CreateClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), url) { Content = JsonContent.Create(new { }) });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_rejects_a_url_from_another_account()
    {
        var (_, admin) = AdminApp();

        var res = await admin.PostAsJsonAsync("/api/admin/testimonials", new
        {
            url = "https://res.cloudinary.com/otra/image/upload/v1/accfenix/a.jpg", publicId = "accfenix/a",
            source = "instagram", width = 100, height = 100,
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).Should().Contain("Cloudinary");
    }

    [Theory]
    [InlineData("https://res.cloudinary.com/demo/video/upload/v1/accfenix/a.mp4", "accfenix/a")]
    [InlineData("https://res.cloudinary.com/demo/image/upload/v1/accfenix/a.jpg", "accfenix/otro")]
    public async Task Create_accepts_only_images_of_their_own_public_id(string url, string publicId)
    {
        var (_, admin) = AdminApp();

        var res = await admin.PostAsJsonAsync("/api/admin/testimonials", new { url, publicId, source = "instagram", width = 100, height = 100 });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_a_caption_that_is_too_long()
    {
        var (_, admin) = AdminApp();

        var res = await admin.PostAsJsonAsync("/api/admin/testimonials", Upload("largo", caption: new string('a', Testimonial.CaptionMaxLength + 1)));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("tiktok")]
    [InlineData("7")]
    public async Task Create_rejects_an_unknown_source(string source)
    {
        var (_, admin) = AdminApp();

        var res = await admin.PostAsJsonAsync("/api/admin/testimonials", Upload("fuente", source));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Patch_rejects_a_caption_that_is_too_long()
    {
        var (_, admin) = AdminApp();
        var id = await CreatedId(await admin.PostAsJsonAsync("/api/admin/testimonials", Upload("patch-largo")));
        try
        {
            var res = await admin.PatchAsJsonAsync($"/api/admin/testimonials/{id}", new { caption = new string('a', Testimonial.CaptionMaxLength + 1) });

            res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/testimonials/{id}");
        }
    }

    [Fact]
    public async Task Only_published_testimonials_are_public_in_their_order()
    {
        var (_, admin) = AdminApp();
        var first = await CreatedId(await admin.PostAsJsonAsync("/api/admin/testimonials", Upload("uno", "whatsApp", "Excelente atención")));
        var second = await CreatedId(await admin.PostAsJsonAsync("/api/admin/testimonials", Upload("dos")));
        try
        {
            var list = await admin.GetFromJsonAsync<JsonElement>("/api/admin/testimonials");
            var created = list.EnumerateArray().Single(t => t.GetProperty("id").GetInt32() == first);
            created.GetProperty("isPublished").GetBoolean().Should().BeFalse();
            created.GetProperty("source").GetString().Should().Be("whatsApp");
            created.GetProperty("caption").GetString().Should().Be("Excelente atención");
            var before = await PublicIds(admin);
            before.Should().NotContain(first);
            before.Should().NotContain(second);

            (await admin.PatchAsJsonAsync($"/api/admin/testimonials/{first}", new { isPublished = true, sortOrder = 2 }))
                .StatusCode.Should().Be(HttpStatusCode.NoContent);
            (await admin.PatchAsJsonAsync($"/api/admin/testimonials/{second}", new { isPublished = true, sortOrder = 1 }))
                .StatusCode.Should().Be(HttpStatusCode.NoContent);

            var published = (await admin.GetFromJsonAsync<JsonElement>("/api/testimonials")).EnumerateArray().ToList();
            published.Select(t => t.GetProperty("id").GetInt32()).Where(id => id == first || id == second).Should().Equal(second, first);
            var item = published.Single(t => t.GetProperty("id").GetInt32() == first);
            item.GetProperty("url").GetString().Should().Be($"{OwnPrefix}uno.jpg");
            item.GetProperty("width").GetInt32().Should().Be(1080);
            item.GetProperty("height").GetInt32().Should().Be(1920);
            item.TryGetProperty("isPublished", out _).Should().BeFalse("the public shape carries only what the gallery needs");

            (await admin.PatchAsJsonAsync($"/api/admin/testimonials/{first}", new { isPublished = false }))
                .StatusCode.Should().Be(HttpStatusCode.NoContent);
            (await PublicIds(admin)).Should().Contain(second).And.NotContain(first);
        }
        finally
        {
            await admin.DeleteAsync($"/api/admin/testimonials/{first}");
            await admin.DeleteAsync($"/api/admin/testimonials/{second}");
        }
    }

    [Fact]
    public async Task Delete_removes_the_row_and_the_stored_file()
    {
        var (_, admin) = AdminApp();
        var id = await CreatedId(await admin.PostAsJsonAsync("/api/admin/testimonials", Upload("borrar")));
        await admin.PatchAsJsonAsync($"/api/admin/testimonials/{id}", new { isPublished = true });

        (await admin.DeleteAsync($"/api/admin/testimonials/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await admin.DeleteAsync($"/api/admin/testimonials/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await PublicIds(admin)).Should().NotContain(id);
        _storage.Deleted.Should().Contain("accfenix/borrar");
    }

    [Fact]
    public async Task Public_endpoint_returns_at_most_24()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Testimonials.AddRange(Enumerable.Range(0, 25).Select(i => new Testimonial
            {
                Url = $"{OwnPrefix}tope-{i}.jpg", CloudinaryPublicId = $"accfenix/tope-{i}", Source = TestimonialSource.Instagram,
                Width = 100, Height = 100, IsPublished = true, SortOrder = i, CreatedAt = DateTime.UtcNow,
            }));
            await db.SaveChangesAsync();
        }
        try
        {
            (await PublicIds(factory.CreateClient())).Should().HaveCount(Testimonial.MaxPublic);
        }
        finally
        {
            using var scope = factory.Services.CreateScope();
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Testimonials
                .Where(t => t.Url.StartsWith($"{OwnPrefix}tope-")).ExecuteDeleteAsync();
        }
    }

    /// <summary>A storage that owns the "demo" cloud and records the files it is asked to delete.</summary>
    sealed class RecordingStorage : IMediaStorage
    {
        public ConcurrentBag<string> Deleted { get; } = [];
        public bool IsConfigured => true;
        public UploadSignature SignUpload() => throw new NotSupportedException();
        public Task DeleteAsync(string publicId, MediaType type, CancellationToken ct)
        {
            Deleted.Add(publicId);
            return Task.CompletedTask;
        }
        public bool IsOwnUrl(string url) => url.StartsWith("https://res.cloudinary.com/demo/", StringComparison.Ordinal);
    }
}
