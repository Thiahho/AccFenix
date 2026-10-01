using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

/// <summary>
/// Inyección SQL, autorización y validación de entradas. Usa su propia base (fuera de la colección "api")
/// para no compartir el límite de intentos de login con los otros tests.
/// </summary>
public class SecurityTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    readonly HttpClient _public = factory.CreateClient();

    /// <summary>Cliente admin con un token emitido directamente, sin gastar intentos de login.</summary>
    HttpClient AdminClient()
    {
        var token = factory.Services.GetRequiredService<TokenService>().Create(new AdminUser { Id = 1, Email = ApiFactory.AdminEmail }).Token;
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    async Task<(int Products, int Variants, int Admins)> Counts()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await db.Products.CountAsync(), await db.Variants.CountAsync(), await db.AdminUsers.CountAsync());
    }

    static StringContent Json(string body) => new(body, Encoding.UTF8, "application/json");

    // ---- Inyección SQL ----

    public static TheoryData<string> SqlPayloads => new()
    {
        "' OR '1'='1",
        "barral' OR '1'='1' --",
        "'; DROP TABLE \"Products\"; --",
        "barral'; DELETE FROM \"Variants\"; --",
        "1 UNION SELECT \"PasswordHash\" FROM \"AdminUsers\"",
        "barral\" OR \"\"=\"",
        "%27%20OR%201=1",
        "barral/**/OR/**/1=1",
        "1; SELECT pg_sleep(5)",
        "\\'; DROP TABLE \"Categories\"; --",
    };

    [Theory]
    [MemberData(nameof(SqlPayloads))]
    public async Task Public_endpoints_treat_sql_payloads_as_plain_text(string payload)
    {
        var before = await Counts();
        var escaped = Uri.EscapeDataString(payload);

        (await _public.GetAsync($"/api/products/{escaped}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await _public.GetAsync($"/api/categories/{escaped}/products")).StatusCode.Should().Be(HttpStatusCode.NotFound);

        var variants = await _public.GetAsync($"/api/variants?ids={escaped}");
        variants.StatusCode.Should().Be(HttpStatusCode.OK);
        (await variants.Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength().Should().BeLessThanOrEqualTo(1);

        (await Counts()).Should().Be(before);
    }

    [Theory]
    [InlineData("' OR '1'='1", "x")]
    [InlineData("admin@test.local' OR '1'='1", "x")]
    [InlineData("admin@test.local'--", "x")]
    [InlineData(ApiFactory.AdminEmail, "' OR '1'='1")]
    public async Task Login_is_not_bypassed_by_sql_payloads(string email, string password)
    {
        var res = await _public.PostAsJsonAsync("/api/auth/login", new { email, password });

        res.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.Unauthorized);
        (await res.Content.ReadAsStringAsync()).Should().NotContain("\"token\"");
    }

    [Fact]
    public async Task Admin_text_fields_store_sql_payloads_literally()
    {
        var client = AdminClient();
        var before = await Counts();
        const string name = "Robert'); DROP TABLE \"Products\"; --";

        var create = await client.PostAsJsonAsync("/api/admin/attributes", new { name, sortOrder = 50 });
        create.StatusCode.Should().Be(HttpStatusCode.Created, await create.Content.ReadAsStringAsync());
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        var attributes = await client.GetFromJsonAsync<JsonElement>("/api/admin/attributes");
        attributes.EnumerateArray().Single(a => a.GetProperty("id").GetInt32() == id).GetProperty("name").GetString().Should().Be(name);
        (await Counts()).Should().Be(before);

        (await client.DeleteAsync($"/api/admin/attributes/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Theory]
    [InlineData("/api/admin/products?categoryId=1%20OR%201=1")]
    [InlineData("/api/admin/products?categoryId=1;DROP%20TABLE%20\"Products\"")]
    public async Task Numeric_parameters_reject_sql_payloads(string url)
    {
        (await AdminClient().GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    /// <summary>Todo el acceso a datos pasa por LINQ (parametrizado). Este test falla si alguien agrega SQL crudo.</summary>
    [Fact]
    public void Source_code_has_no_raw_sql()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "src", "AccFenix.Api"))) dir = dir.Parent;
        dir.Should().NotBeNull("los tests se ejecutan dentro del repositorio");

        var src = Path.Combine(dir!.FullName, "src", "AccFenix.Api");
        var forbidden = new Regex(@"FromSql|ExecuteSql|SqlQuery|NpgsqlCommand|CommandText");
        var offenders = Directory.EnumerateFiles(src, "*.cs", SearchOption.AllDirectories)
            .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}Migrations{Path.DirectorySeparatorChar}")
                && !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
                && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
            .Where(f => forbidden.IsMatch(File.ReadAllText(f)))
            .Select(Path.GetFileName)
            .ToList();

        offenders.Should().BeEmpty();
    }

    // ---- Autorización ----

    [Fact]
    public void Every_admin_route_requires_authorization()
    {
        var adminRoutes = factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText?.StartsWith("/api/admin", StringComparison.Ordinal) == true)
            .ToList();

        adminRoutes.Should().HaveCountGreaterThan(20);
        adminRoutes.Should().OnlyContain(e => e.Metadata.GetMetadata<IAuthorizeData>() != null && e.Metadata.GetMetadata<IAllowAnonymous>() == null);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Bearer abc.def.ghi")]
    [InlineData("Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIn0.")] // alg: none
    public async Task Admin_rejects_missing_or_forged_tokens(string authorization)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/admin/products");
        if (authorization.Length > 0) req.Headers.TryAddWithoutValidation("Authorization", authorization);

        (await _public.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ---- Validación de entradas ----

    [Theory]
    [InlineData("POST", "/api/admin/attributes", """{"name":"!!!","sortOrder":0}""")]
    [InlineData("POST", "/api/admin/attributes", """{"name":"Dos\nlíneas","sortOrder":0}""")]
    [InlineData("POST", "/api/admin/attributes", """{"name":"Orden","sortOrder":1000001}""")]
    [InlineData("POST", "/api/admin/attributes", """{"name":"","sortOrder":0}""")]
    [InlineData("POST", "/api/admin/categories", """{"name":"Sin atributos válidos","sortOrder":0,"isActive":true,"attributeIds":[0]}""")]
    [InlineData("POST", "/api/admin/categories", """{"name":"Sin lista","sortOrder":0,"isActive":true}""")]
    [InlineData("POST", "/api/admin/products", """{"categoryId":0,"name":"Producto","sortOrder":0,"isActive":true,"allowedValueIds":[]}""")]
    [InlineData("POST", "/api/admin/products", """{"categoryId":1,"name":"Nulo","description":"a\u0000b","sortOrder":0,"isActive":true,"allowedValueIds":[]}""")]
    [InlineData("POST", "/api/admin/attributes/1/values", """{"label":"Rojo","sortOrder":0,"colorHex":"red"}""")]
    [InlineData("PATCH", "/api/admin/variants/1", """{"availability":99}""")]
    [InlineData("PATCH", "/api/admin/variants/1", """{"availability":"inexistente"}""")]
    [InlineData("PATCH", "/api/admin/variants/bulk", """{"productId":1,"valueIds":[-1],"availability":"aPedido"}""")]
    [InlineData("PATCH", "/api/admin/variants/bulk", """{"productId":1,"valueIds":[],"availability":7}""")]
    [InlineData("POST", "/api/admin/products/1/media", """{"url":"https://evil.example/x.jpg","publicId":"x","type":"image"}""")]
    [InlineData("POST", "/api/admin/products/1/media", """{"url":"https://res.cloudinary.com/demo/image/upload/v1/accfenix/a.jpg","publicId":"accfenix/otro","type":"image"}""")]
    [InlineData("PATCH", "/api/admin/media/1", """{"sortOrder":99999999}""")]
    [InlineData("PUT", "/api/admin/settings", """{"whatsappNumber":"11 2233-4455; DROP","wholesaleThreshold":100}""")]
    public async Task Admin_rejects_invalid_input(string method, string url, string body)
    {
        var res = await AdminClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), url) { Content = Json(body) });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest, await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Admin_rejects_oversized_text_and_lists()
    {
        var client = AdminClient();

        (await client.PostAsJsonAsync("/api/admin/categories", new { name = "Larga", description = new string('a', 2001), sortOrder = 0, isActive = true, attributeIds = Array.Empty<int>() }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.PostAsJsonAsync("/api/admin/categories", new { name = "Muchos", sortOrder = 0, isActive = true, attributeIds = Enumerable.Range(1, 51) }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.PostAsJsonAsync("/api/admin/attributes", new { name = new string('a', 81), sortOrder = 0 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_rejects_oversized_credentials()
    {
        var res = await _public.PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.AdminEmail, password = new string('a', 201) });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Duplicate_names_return_conflict()
    {
        (await AdminClient().PostAsJsonAsync("/api/admin/attributes", new { name = "Color", sortOrder = 0 }))
            .StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Theory]
    [InlineData("/api/products/BARRAL")]
    [InlineData("/api/products/barral%20")]
    [InlineData("/api/products/barral%0A")]
    [InlineData("/api/categories/kits%09/products")]
    public async Task Malformed_slugs_are_not_found(string url)
    {
        (await _public.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Overlong_slug_is_not_found()
    {
        (await _public.GetAsync($"/api/products/{new string('a', 500)}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("https://res.cloudinary.com/demo/image/upload/v1/accfenix/a.jpg", "accfenix/a", true)]
    [InlineData("https://res.cloudinary.com/demo/video/upload/v1/abc123.mp4", "abc123", true)]
    [InlineData("https://res.cloudinary.com/demo/image/upload/v1/accfenix/a.jpg", "a", false)]
    [InlineData("https://res.cloudinary.com/demo/image/upload/v1/accfenix/a.jpg", "accfenix/b", false)]
    [InlineData("https://res.cloudinary.com/demo/image/upload/accfenix/a.jpg", "accfenix/a", true)]
    [InlineData("https://res.cloudinary.com/demo/image/upload/v1/accfenix/a.jpg", "", false)]
    [InlineData("https://res.cloudinary.com/demo/image/fetch/accfenix/a.jpg", "accfenix/a", false)]
    [InlineData("no es una url", "a", false)]
    public void Media_public_id_must_match_its_url(string url, string publicId, bool expected)
    {
        MediaUrl.HasPublicId(url, publicId).Should().Be(expected);
    }

    [Theory]
    [InlineData("barral", true)]
    [InlineData("kit-1-20-a-1-60-simple", true)]
    [InlineData("", false)]
    [InlineData("Barral", false)]
    [InlineData("barral'--", false)]
    [InlineData("barral\0", false)]
    public void Slug_format_check(string text, bool expected)
    {
        Slug.IsValid(text).Should().Be(expected);
    }
}
