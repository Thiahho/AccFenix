using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace AccFenix.Api.Tests;

[Collection(ApiCollection.Name)]
public class AdminEndpointsTests(ApiFactory factory)
{
    async Task<HttpClient> AdminClient()
    {
        var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword });
        res.EnsureSuccessStatusCode();
        var token = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    static async Task<int> CreatedId(HttpResponseMessage res)
    {
        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    [Theory]
    [InlineData("GET", "/api/admin/categories")]
    [InlineData("PUT", "/api/admin/settings")]
    [InlineData("PATCH", "/api/admin/variants/1")]
    [InlineData("POST", "/api/admin/media/signature")]
    public async Task Admin_endpoints_require_a_token(string method, string url)
    {
        var res = await factory.CreateClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), url) { Content = JsonContent.Create(new { }) });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_rejects_wrong_password()
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.AdminEmail, password = "nope" });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task New_category_attribute_and_product_generate_variants_that_can_be_toggled()
    {
        var client = await AdminClient();

        // Nuevo atributo "Color de cáscara" con dos valores
        var attrId = await CreatedId(await client.PostAsJsonAsync("/api/admin/attributes", new { name = "Color de cáscara", sortOrder = 9 }));
        var blancoId = await CreatedId(await client.PostAsJsonAsync($"/api/admin/attributes/{attrId}/values", new { label = "Blanco", sortOrder = 0 }));
        var coloradoId = await CreatedId(await client.PostAsJsonAsync($"/api/admin/attributes/{attrId}/values", new { label = "Colorado", sortOrder = 1 }));

        // Presentación ya existe por el seed
        var attributes = await client.GetFromJsonAsync<JsonElement>("/api/admin/attributes");
        var presentacion = attributes.EnumerateArray().Single(a => a.GetProperty("slug").GetString() == "presentacion");
        var presentacionValues = presentacion.GetProperty("values").EnumerateArray().Select(v => v.GetProperty("id").GetInt32()).ToList();

        var categoryId = await CreatedId(await client.PostAsJsonAsync("/api/admin/categories", new
        {
            name = "Huevos Test", description = "x", sortOrder = 5, isActive = true,
            attributeIds = new[] { attrId, presentacion.GetProperty("id").GetInt32() },
        }));

        var create = await client.PostAsJsonAsync("/api/admin/products", new
        {
            categoryId, name = "Huevo Test", sortOrder = 0, isActive = true,
            allowedValueIds = presentacionValues.Append(blancoId).Append(coloradoId).ToArray(),
        });
        var productId = await CreatedId(create);

        var product = await client.GetFromJsonAsync<JsonElement>($"/api/admin/products/{productId}");
        product.GetProperty("variants").GetArrayLength().Should().Be(6); // 2 colores × 3 presentaciones

        // Bulk: todo "Colorado" → a pedido
        var bulk = await client.PatchAsJsonAsync("/api/admin/variants/bulk", new { productId, valueIds = new[] { coloradoId }, availability = "aPedido" });
        (await bulk.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("updated").GetInt32().Should().Be(3);

        var publicProduct = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/products/huevo-test");
        publicProduct.GetProperty("variants").EnumerateArray()
            .Count(v => v.GetProperty("availability").GetString() == "aPedido").Should().Be(3);

        // Quitar el valor "Blanco" desactiva sus variantes (no las borra)
        var update = await client.PutAsJsonAsync($"/api/admin/products/{productId}", new
        {
            categoryId, name = "Huevo Test", sortOrder = 0, isActive = true,
            allowedValueIds = presentacionValues.Append(coloradoId).ToArray(),
        });
        update.StatusCode.Should().Be(HttpStatusCode.OK, await update.Content.ReadAsStringAsync());
        var afterUpdate = await client.GetFromJsonAsync<JsonElement>($"/api/admin/products/{productId}");
        afterUpdate.GetProperty("variants").EnumerateArray().Count(v => v.GetProperty("isActive").GetBoolean()).Should().Be(3);

        // La categoría con productos no se puede borrar; el valor en uso tampoco
        (await client.DeleteAsync($"/api/admin/categories/{categoryId}")).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await client.DeleteAsync($"/api/admin/attribute-values/{coloradoId}")).StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Limpieza: producto → categoría → atributo
        (await client.DeleteAsync($"/api/admin/products/{productId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.DeleteAsync($"/api/admin/categories/{categoryId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.DeleteAsync($"/api/admin/attributes/{attrId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Product_rejects_values_outside_its_category_attributes()
    {
        var client = await AdminClient();
        var categories = await client.GetFromJsonAsync<JsonElement>("/api/admin/categories");
        var huevos = categories.EnumerateArray().Single(c => c.GetProperty("slug").GetString() == "huevos").GetProperty("id").GetInt32();
        // Atributo propio del test, ajeno a la categoría "Huevos"
        var attrId = await CreatedId(await client.PostAsJsonAsync("/api/admin/attributes", new { name = "Calibre test", sortOrder = 9 }));
        var foreignValue = await CreatedId(await client.PostAsJsonAsync($"/api/admin/attributes/{attrId}/values", new { label = "Jumbo", sortOrder = 0 }));

        var res = await client.PostAsJsonAsync("/api/admin/products", new
        {
            categoryId = huevos, name = "Huevo inválido", sortOrder = 0, isActive = true, allowedValueIds = new[] { foreignValue },
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.DeleteAsync($"/api/admin/attributes/{attrId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Single_variant_toggle_is_reflected_publicly()
    {
        var client = await AdminClient();
        var product = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/products/huevos-n-1");
        var variantId = product.GetProperty("variants")[0].GetProperty("id").GetInt32();

        (await client.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { availability = "aPedido" })).EnsureSuccessStatusCode();
        var status = await factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/variants?ids={variantId}");
        status[0].GetProperty("availability").GetString().Should().Be("aPedido");

        (await client.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { availability = "disponible" })).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Settings_update_is_validated_and_public()
    {
        var client = await AdminClient();

        (await client.PutAsJsonAsync("/api/admin/settings", new { whatsappNumber = "abc" }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PutAsJsonAsync("/api/admin/settings", new { whatsappNumber = "+54 9 11 2233-4455" }))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);
        var pub = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/settings/public");
        pub.GetProperty("whatsappNumber").GetString().Should().Be("5491122334455");
        pub.TryGetProperty("wholesaleThreshold", out _).Should().BeFalse();

        // Restaurar el valor por defecto para no afectar otros tests
        (await client.PutAsJsonAsync("/api/admin/settings", new { whatsappNumber = "5491122692061" })).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Media_signature_reports_missing_cloudinary_config()
    {
        var client = await AdminClient();

        (await client.PostAsync("/api/admin/media/signature", null)).StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }
}
