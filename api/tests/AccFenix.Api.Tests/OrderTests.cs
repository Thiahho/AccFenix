using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

/// <summary>
/// Persisted orders: public creation with a server-side price snapshot and the admin endpoints.
/// Every test works on its own throwaway product, and every public request uses its own visitor IP
/// so the order rate limit never interferes (except in the test that exercises it).
/// </summary>
[Collection(ApiCollection.Name)]
public class OrderTests(ApiFactory factory)
{
    const int RateLimit = 10;
    const string OrdersUrl = "/api/orders";
    const string AdminOrdersUrl = "/api/admin/orders";

    static int _ipCounter;

    readonly HttpClient _public = factory.CreateClient();

    static string NextIp()
    {
        var n = Interlocked.Increment(ref _ipCounter);
        return $"10.20.{n / 250}.{n % 250 + 1}";
    }

    /// <summary>Admin client with a directly issued token, so login attempts are not consumed.</summary>
    HttpClient AdminClient()
    {
        var token = factory.Services.GetRequiredService<TokenService>().Create(new AdminUser { Id = 1, Email = ApiFactory.AdminEmail }).Token;
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    Task<HttpResponseMessage> PostOrder(HttpContent content, string? ip = null)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, OrdersUrl) { Content = content };
        req.Headers.Add(ClientIp.IpHeader, ip ?? NextIp());
        req.Headers.Add(ClientIp.KeyHeader, ApiFactory.TrustedWebKey);
        return _public.SendAsync(req);
    }

    Task<HttpResponseMessage> PostOrder(Dictionary<string, object?> body, string? ip = null) => PostOrder(JsonContent.Create(body), ip);

    Task<HttpResponseMessage> PostOrder(string json, string? ip = null) => PostOrder(new StringContent(json, Encoding.UTF8, "application/json"), ip);

    async Task<JsonElement> Created(Dictionary<string, object?> body)
    {
        var res = await PostOrder(body);
        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    static object[] Lines(params (int VariantId, int Quantity)[] items) =>
        items.Select(i => (object)new { variantId = i.VariantId, quantity = i.Quantity }).ToArray();

    static Dictionary<string, object?> BuenosAires(params (int VariantId, int Quantity)[] items) => new()
    {
        ["zone"] = "buenosAires",
        ["customerType"] = "personal",
        ["customerName"] = "Ana Pérez",
        ["phone"] = "11 5555-0000",
        ["locality"] = "Morón",
        ["address"] = "Av. Siempre Viva 742",
        ["items"] = Lines(items),
    };

    static Dictionary<string, object?> OtherProvince(params (int VariantId, int Quantity)[] items) => new()
    {
        ["zone"] = "otherProvince",
        ["customerType"] = "personal",
        ["customerName"] = "Luis Gómez",
        ["phone"] = "351 555-0000",
        ["province"] = "Córdoba",
        ["carrier"] = "Expreso Lancioni",
        ["items"] = Lines(items),
    };

    static Dictionary<string, object?> With(Dictionary<string, object?> body, string key, object? value) => new(body) { [key] = value };

    static Dictionary<string, object?> Business(Dictionary<string, object?> body) => With(body, "customerType", "business");

    static Dictionary<string, object?> Without(Dictionary<string, object?> body, string key)
    {
        var copy = new Dictionary<string, object?>(body);
        copy.Remove(key);
        return copy;
    }

    static decimal? Money(JsonElement element, string property) =>
        element.GetProperty(property).ValueKind == JsonValueKind.Null ? null : element.GetProperty(property).GetDecimal();

    static List<JsonElement> Items(JsonElement order) => order.GetProperty("items").EnumerateArray().ToList();

    async Task<int> WholesaleThreshold() =>
        (await _public.GetFromJsonAsync<JsonElement>("/api/settings/public")).GetProperty("wholesaleThreshold").GetInt32();

    async Task<int> TotalOrders(HttpClient admin, string query = "") =>
        (await admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?pageSize=1{query}")).GetProperty("total").GetInt32();

    /// <summary>A product with one attribute and two values, hence two variants ("First" and "Second").</summary>
    sealed record TestProduct(HttpClient Admin, int AttributeId, int CategoryId, int ProductId, string Name, string AttributeName, int First, int Second) : IAsyncDisposable
    {
        public async Task SetPrices(int variantId, decimal? retailPrice, decimal? wholesalePrice) =>
            (await Admin.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { retailPrice, wholesalePrice })).EnsureSuccessStatusCode();

        public async Task<string> Sku(int variantId) =>
            (await Admin.GetFromJsonAsync<JsonElement>($"/api/admin/products/{ProductId}")).GetProperty("variants").EnumerateArray()
                .Single(v => v.GetProperty("id").GetInt32() == variantId).GetProperty("sku").GetString()!;

        public async Task SetProductActive(bool isActive) =>
            (await Admin.PutAsJsonAsync($"/api/admin/products/{ProductId}",
                new { categoryId = CategoryId, name = Name, sortOrder = 0, isActive, allowedValueIds = await AllowedValueIds() })).EnsureSuccessStatusCode();

        async Task<List<int>> AllowedValueIds() =>
            (await Admin.GetFromJsonAsync<JsonElement>($"/api/admin/products/{ProductId}")).GetProperty("allowedValueIds").EnumerateArray().Select(v => v.GetInt32()).ToList();

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
        var name = $"order-test-{Guid.NewGuid():N}";
        var attributeName = $"attr-{name}";
        var attributeId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/attributes", new { name = attributeName, sortOrder = 50 }));
        var firstValue = await CreatedId(await admin.PostAsJsonAsync($"/api/admin/attributes/{attributeId}/values", new { label = "First", sortOrder = 0 }));
        var secondValue = await CreatedId(await admin.PostAsJsonAsync($"/api/admin/attributes/{attributeId}/values", new { label = "Second", sortOrder = 1 }));
        var categoryId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/categories",
            new { name = $"cat-{name}", sortOrder = 50, isActive = true, attributeIds = new[] { attributeId } }));
        var productId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/products",
            new { categoryId, name, sortOrder = 0, isActive = true, allowedValueIds = new[] { firstValue, secondValue } }));

        var variants = (await admin.GetFromJsonAsync<JsonElement>($"/api/admin/products/{productId}")).GetProperty("variants").EnumerateArray().ToList();
        int VariantOf(int valueId) => variants.Single(v => v.GetProperty("valueIds").EnumerateArray().Any(x => x.GetInt32() == valueId)).GetProperty("id").GetInt32();
        return new TestProduct(admin, attributeId, categoryId, productId, name, attributeName, VariantOf(firstValue), VariantOf(secondValue));
    }

    // ---- Creation and pricing ----

    [Fact]
    public async Task Order_below_the_threshold_uses_retail_prices()
    {
        await using var product = await CreateProduct();
        await product.SetPrices(product.First, 100.50m, 80m);
        var quantity = await WholesaleThreshold() - 1;

        var order = await Created(BuenosAires((product.First, quantity)));

        order.GetProperty("id").GetInt32().Should().BePositive();
        order.GetProperty("number").GetInt32().Should().BePositive();
        order.GetProperty("status").GetString().Should().Be("pending");
        order.GetProperty("isWholesale").GetBoolean().Should().BeFalse();
        order.GetProperty("hasUnpricedItems").GetBoolean().Should().BeFalse();
        Money(order, "total").Should().Be(100.50m * quantity);

        var line = Items(order).Should().ContainSingle().Subject;
        line.GetProperty("variantId").GetInt32().Should().Be(product.First);
        line.GetProperty("productName").GetString().Should().Be(product.Name);
        line.GetProperty("sku").GetString().Should().Be(await product.Sku(product.First));
        line.GetProperty("variantLabel").GetString().Should().Be($"{product.AttributeName} First");
        line.GetProperty("quantity").GetInt32().Should().Be(quantity);
        Money(line, "unitPrice").Should().Be(100.50m);
        Money(line, "subtotal").Should().Be(100.50m * quantity);

        // The public response never echoes the customer's personal data.
        order.TryGetProperty("phone", out _).Should().BeFalse();
        order.TryGetProperty("customerName", out _).Should().BeFalse();
        order.TryGetProperty("address", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Order_at_exactly_the_threshold_uses_wholesale_prices()
    {
        await using var product = await CreateProduct();
        await product.SetPrices(product.First, 100m, 80m);
        await product.SetPrices(product.Second, 60m, 45.25m);
        var threshold = await WholesaleThreshold();

        // The threshold counts the units of the whole order, not of each line.
        var order = await Created(BuenosAires((product.First, threshold - 1), (product.Second, 1)));

        order.GetProperty("isWholesale").GetBoolean().Should().BeTrue();
        var lines = Items(order).ToDictionary(l => l.GetProperty("variantId").GetInt32());
        Money(lines[product.First], "unitPrice").Should().Be(80m);
        Money(lines[product.First], "subtotal").Should().Be(80m * (threshold - 1));
        Money(lines[product.Second], "unitPrice").Should().Be(45.25m);
        Money(order, "total").Should().Be(80m * (threshold - 1) + 45.25m);
    }

    [Fact]
    public async Task Variant_without_wholesale_price_falls_back_to_retail_in_a_wholesale_order()
    {
        await using var product = await CreateProduct();
        await product.SetPrices(product.First, 100m, 80m);
        await product.SetPrices(product.Second, 60m, null);
        var threshold = await WholesaleThreshold();

        var order = await Created(BuenosAires((product.First, threshold), (product.Second, 2)));

        order.GetProperty("isWholesale").GetBoolean().Should().BeTrue();
        order.GetProperty("hasUnpricedItems").GetBoolean().Should().BeFalse();
        var lines = Items(order).ToDictionary(l => l.GetProperty("variantId").GetInt32());
        Money(lines[product.First], "unitPrice").Should().Be(80m);
        Money(lines[product.Second], "unitPrice").Should().Be(60m);
        Money(order, "total").Should().Be(80m * threshold + 120m);
    }

    [Fact]
    public async Task Unpriced_variants_have_null_line_prices_and_flag_the_order()
    {
        await using var product = await CreateProduct();
        await product.SetPrices(product.First, 10m, null);
        // A wholesale price alone does not price a retail order.
        await product.SetPrices(product.Second, null, 5m);

        var order = await Created(BuenosAires((product.First, 3), (product.Second, 4)));

        order.GetProperty("isWholesale").GetBoolean().Should().BeFalse();
        order.GetProperty("hasUnpricedItems").GetBoolean().Should().BeTrue();
        Money(order, "total").Should().Be(30m);
        var lines = Items(order).ToDictionary(l => l.GetProperty("variantId").GetInt32());
        Money(lines[product.First], "subtotal").Should().Be(30m);
        Money(lines[product.Second], "unitPrice").Should().BeNull();
        Money(lines[product.Second], "subtotal").Should().BeNull();
    }

    [Fact]
    public async Task Stored_snapshot_survives_later_catalog_changes()
    {
        var product = await CreateProduct();
        await product.SetPrices(product.First, 100m, 80m);
        var sku = await product.Sku(product.First);
        var id = (await Created(BuenosAires((product.First, 2)))).GetProperty("id").GetInt32();

        await product.SetPrices(product.First, 999m, 888m);
        var afterPriceChange = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        Money(afterPriceChange, "total").Should().Be(200m);
        Money(Items(afterPriceChange).Single(), "unitPrice").Should().Be(100m);
        Money(Items(afterPriceChange).Single(), "subtotal").Should().Be(200m);

        // Deleting the product removes its variants; the order keeps its own copy of the line.
        await product.DisposeAsync();
        var afterDelete = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        var line = Items(afterDelete).Single();
        line.GetProperty("variantId").ValueKind.Should().Be(JsonValueKind.Null);
        line.GetProperty("productName").GetString().Should().Be(product.Name);
        line.GetProperty("sku").GetString().Should().Be(sku);
        line.GetProperty("variantLabel").GetString().Should().Be($"{product.AttributeName} First");
        Money(line, "unitPrice").Should().Be(100m);
        Money(afterDelete, "total").Should().Be(200m);
    }

    [Fact]
    public async Task Order_numbers_are_sequential()
    {
        await using var product = await CreateProduct();

        var first = (await Created(BuenosAires((product.First, 1)))).GetProperty("number").GetInt32();
        var second = (await Created(OtherProvince((product.Second, 1)))).GetProperty("number").GetInt32();
        var third = (await Created(BuenosAires((product.First, 1)))).GetProperty("number").GetInt32();

        second.Should().Be(first + 1);
        third.Should().Be(first + 2);
    }

    [Fact]
    public async Task Prices_and_server_fields_sent_by_the_client_are_ignored()
    {
        await using var product = await CreateProduct();
        await product.SetPrices(product.First, 100m, 80m);

        var res = await PostOrder($$"""
            {"zone":"buenosAires","customerType":"personal","customerName":"Ana","phone":"11 5555-0000","locality":"Morón","address":"Calle 1",
             "id":999999,"number":999999,"status":"delivered","isWholesale":true,"total":1,"hasUnpricedItems":true,
             "items":[{"variantId":{{product.First}},"quantity":2,"unitPrice":0.01,"subtotal":0.02,"wholesalePrice":0.01,"productName":"Fake","sku":"FAKE"}]}
            """);

        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        var order = await res.Content.ReadFromJsonAsync<JsonElement>();
        order.GetProperty("number").GetInt32().Should().NotBe(999999);
        order.GetProperty("status").GetString().Should().Be("pending");
        order.GetProperty("isWholesale").GetBoolean().Should().BeFalse();
        order.GetProperty("hasUnpricedItems").GetBoolean().Should().BeFalse();
        Money(order, "total").Should().Be(200m);
        var line = Items(order).Single();
        Money(line, "unitPrice").Should().Be(100m);
        line.GetProperty("productName").GetString().Should().Be(product.Name);

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{order.GetProperty("id").GetInt32()}");
        Money(stored, "total").Should().Be(200m);
        stored.GetProperty("status").GetString().Should().Be("pending");
    }

    // ---- Validation ----

    [Fact]
    public async Task Invalid_orders_are_rejected_and_nothing_is_stored()
    {
        await using var product = await CreateProduct();
        var ba = BuenosAires((product.First, 1));
        var op = OtherProvince((product.First, 1));
        var long121 = new string('a', 121);
        var long201 = new string('a', 201);
        var before = await TotalOrders(product.Admin);

        var cases = new Dictionary<string, Dictionary<string, object?>>
        {
            ["missing zone"] = Without(ba, "zone"),
            ["unknown zone"] = With(ba, "zone", "mars"),
            ["numeric zone"] = With(ba, "zone", 0),

            ["missing customer type"] = Without(ba, "customerType"),
            ["null customer type"] = With(ba, "customerType", null),
            ["unknown customer type"] = With(ba, "customerType", "company"),
            ["numeric customer type"] = With(ba, "customerType", 1),

            ["BA: missing name"] = Without(ba, "customerName"),
            ["BA: blank name"] = With(ba, "customerName", "   "),
            ["BA: name too long"] = With(ba, "customerName", long121),
            ["BA: name with a line break"] = With(ba, "customerName", "Ana\nPérez"),
            ["BA: phone too long"] = With(ba, "phone", new string('1', 41)),
            ["BA: phone with a line break"] = With(ba, "phone", "11\n5555-0000"),
            ["BA: missing locality"] = Without(ba, "locality"),
            ["BA: locality too long"] = With(ba, "locality", long121),
            ["BA: blank address"] = With(ba, "address", " "),
            ["BA: address too long"] = With(ba, "address", long201),
            ["BA: comments too long"] = With(ba, "comments", new string('a', 501)),
            ["BA: comments with a null character"] = With(ba, "comments", "a\0b"),
            ["BA: latitude out of range"] = With(With(ba, "latitude", 90.01), "longitude", 10),
            ["BA: longitude out of range"] = With(With(ba, "latitude", 10), "longitude", -180.01),
            ["BA: latitude without longitude"] = With(ba, "latitude", -34.6),
            ["BA: longitude without latitude"] = With(ba, "longitude", -58.4),
            ["BA: province belongs to the other zone"] = With(ba, "province", "Córdoba"),
            ["BA: carrier belongs to the other zone"] = With(ba, "carrier", "Expreso"),

            ["OP: missing name"] = Without(op, "customerName"),
            ["OP: phone too long once trimmed"] = With(op, "phone", $"  {new string('1', 41)}  "),
            ["OP: missing province"] = Without(op, "province"),
            ["OP: unknown province"] = With(op, "province", "Atlantis"),
            ["OP: Buenos Aires is not another province"] = With(op, "province", "Buenos Aires"),
            ["OP: blank carrier"] = With(op, "carrier", ""),
            ["OP: carrier too long"] = With(op, "carrier", long201),
            ["OP: comments too long"] = With(op, "comments", new string('a', 501)),
            ["OP: locality belongs to the other zone"] = With(op, "locality", "Morón"),
            ["OP: address belongs to the other zone"] = With(op, "address", "Calle 1"),
            ["OP: coordinates belong to the other zone"] = With(With(op, "latitude", -34.6), "longitude", -58.4),

            ["missing items"] = Without(ba, "items"),
            ["no lines"] = With(ba, "items", Lines()),
            ["null line"] = With(ba, "items", new object?[] { null }),
            ["too many lines"] = With(ba, "items", Lines(Enumerable.Range(1, 101).Select(i => (i, 1)).ToArray())),
            ["duplicate variants"] = With(ba, "items", Lines((product.First, 1), (product.Second, 1), (product.First, 2))),
            ["quantity zero"] = With(ba, "items", Lines((product.First, 0))),
            ["negative quantity"] = With(ba, "items", Lines((product.First, -5))),
            ["quantity above the maximum"] = With(ba, "items", Lines((product.First, 100_001))),
            ["variant id zero"] = With(ba, "items", Lines((0, 1))),
            ["unknown variant"] = With(ba, "items", Lines((product.First, 1), (int.MaxValue, 1))),
        };

        foreach (var (name, body) in cases)
        {
            var res = await PostOrder(body);
            res.StatusCode.Should().Be(HttpStatusCode.BadRequest, $"case '{name}' must be rejected: {await res.Content.ReadAsStringAsync()}");
        }

        (await TotalOrders(product.Admin)).Should().Be(before);
    }

    [Fact]
    public async Task Validation_errors_are_reported_per_field()
    {
        await using var product = await CreateProduct();

        var res = await PostOrder(With(With(BuenosAires((product.First, 0)), "phone", new string('1', 41)), "address", ""));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.EnumerateObject().Select(e => e.Name).Should().Contain(new[] { "Phone", "Address", "Items[0].Quantity" });
    }

    [Fact]
    public async Task Inactive_variants_and_products_cannot_be_ordered()
    {
        await using var product = await CreateProduct();
        (await product.Admin.PatchAsJsonAsync($"/api/admin/variants/{product.Second}", new { isActive = false })).EnsureSuccessStatusCode();

        (await PostOrder(BuenosAires((product.First, 1), (product.Second, 1)))).StatusCode.Should().Be(HttpStatusCode.BadRequest, "the second variant is inactive");
        (await PostOrder(BuenosAires((product.First, 1)))).StatusCode.Should().Be(HttpStatusCode.Created, "the first variant is still active");

        await product.SetProductActive(false);
        (await PostOrder(BuenosAires((product.First, 1)))).StatusCode.Should().Be(HttpStatusCode.BadRequest, "the product is inactive");
    }

    [Fact]
    public async Task Order_whose_total_does_not_fit_the_money_column_is_rejected()
    {
        await using var product = await CreateProduct();
        await product.SetPrices(product.First, 99_999_999.99m, null);

        var res = await PostOrder(BuenosAires((product.First, 100_000)));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest, await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Boundary_values_are_accepted_and_text_is_trimmed()
    {
        await using var product = await CreateProduct();
        var body = BuenosAires((product.First, 100_000));
        body["customerName"] = $"  {new string('n', 120)}  ";
        body["phone"] = new string('1', 40);
        body["locality"] = new string('l', 120);
        body["address"] = new string('d', 200);
        body["comments"] = $"{new string('c', 249)}\n{new string('c', 250)}";
        body["latitude"] = -90;
        body["longitude"] = 180;

        var id = (await Created(body)).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerName").GetString().Should().Be(new string('n', 120));
        stored.GetProperty("comments").GetString().Should().HaveLength(500);
        stored.GetProperty("latitude").GetDouble().Should().Be(-90);
        stored.GetProperty("longitude").GetDouble().Should().Be(180);
        Items(stored).Single().GetProperty("quantity").GetInt32().Should().Be(100_000);
    }

    // ---- Customer type ----

    [Fact]
    public async Task Personal_order_is_stored_as_personal()
    {
        await using var product = await CreateProduct();

        var id = (await Created(BuenosAires((product.First, 1)))).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerType").GetString().Should().Be("personal");
        stored.TryGetProperty("businessName", out _).Should().BeFalse("orders no longer record a business name");
    }

    [Fact]
    public async Task Business_order_needs_no_business_name()
    {
        await using var product = await CreateProduct();

        var id = (await Created(Business(OtherProvince((product.First, 1))))).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerType").GetString().Should().Be("business");
        stored.TryGetProperty("businessName", out _).Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    [InlineData("Almacén\nDon José")]
    public async Task Business_name_in_the_body_is_ignored(string? businessName)
    {
        await using var product = await CreateProduct();

        var body = With(Business(BuenosAires((product.First, 1))), "businessName", businessName);
        var id = (await Created(body)).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerType").GetString().Should().Be("business");
        stored.TryGetProperty("businessName", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Admin_list_shows_the_customer_type()
    {
        await using var product = await CreateProduct();
        var personal = (await Created(BuenosAires((product.First, 1)))).GetProperty("id").GetInt32();
        var business = (await Created(Business(BuenosAires((product.First, 1))))).GetProperty("id").GetInt32();

        var list = Items(await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?pageSize=100"))
            .ToDictionary(o => o.GetProperty("id").GetInt32());

        list[personal].GetProperty("customerType").GetString().Should().Be("personal");
        list[business].GetProperty("customerType").GetString().Should().Be("business");
        list[business].TryGetProperty("businessName", out _).Should().BeFalse();
    }

    // ---- Phone ----

    [Theory]
    [InlineData("absent")]
    [InlineData("null")]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Order_without_phone_is_stored_without_phone(string phone)
    {
        await using var product = await CreateProduct();
        // The customer sends the order from their own WhatsApp, so the distributor already has the number.
        var body = phone switch
        {
            "absent" => Without(BuenosAires((product.First, 1)), "phone"),
            "null" => With(BuenosAires((product.First, 1)), "phone", null),
            _ => With(BuenosAires((product.First, 1)), "phone", phone),
        };

        var id = (await Created(body)).GetProperty("id").GetInt32();

        var detail = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        detail.GetProperty("phone").ValueKind.Should().Be(JsonValueKind.Null);
        var list = Items(await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?pageSize=100"));
        list.Single(o => o.GetProperty("id").GetInt32() == id).GetProperty("phone").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Phone_sent_by_the_customer_is_trimmed_and_stored()
    {
        await using var product = await CreateProduct();

        var id = (await Created(With(OtherProvince((product.First, 1)), "phone", "  351 555-0000  "))).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("phone").GetString().Should().Be("351 555-0000");
    }

    // ---- Rate limit ----

    [Fact]
    public async Task Order_creation_is_rate_limited_per_visitor()
    {
        await using var product = await CreateProduct();
        var visitor = NextIp();

        // Rejected requests count too: the limit protects the endpoint, not only the table.
        for (var i = 0; i < RateLimit; i++)
        {
            var body = i % 2 == 0 ? BuenosAires((product.First, 1)) : With(BuenosAires((product.First, 1)), "address", "");
            (await PostOrder(body, visitor)).StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.BadRequest);
        }
        (await PostOrder(BuenosAires((product.First, 1)), visitor)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        // Another visitor is not affected.
        (await PostOrder(BuenosAires((product.First, 1)))).StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Forwarded_ip_does_not_grant_a_new_quota_without_the_shared_key()
    {
        await using var product = await CreateProduct();
        var statuses = new List<HttpStatusCode>();

        // Without the key every request counts against the connection, whatever the header says.
        for (var i = 0; i <= RateLimit; i++)
        {
            var req = new HttpRequestMessage(HttpMethod.Post, OrdersUrl) { Content = JsonContent.Create(BuenosAires((product.First, 1))) };
            req.Headers.Add(ClientIp.IpHeader, NextIp());
            statuses.Add((await _public.SendAsync(req)).StatusCode);
        }

        statuses.Last().Should().Be(HttpStatusCode.TooManyRequests);
    }

    // ---- Admin ----

    [Fact]
    public async Task Admin_lists_orders_newest_first_and_paged()
    {
        await using var product = await CreateProduct();
        await product.SetPrices(product.First, 10m, null);
        var before = await TotalOrders(product.Admin);
        var numbers = new List<int>();
        for (var i = 1; i <= 3; i++)
        {
            numbers.Add((await Created(BuenosAires((product.First, i), (product.Second, 1)))).GetProperty("number").GetInt32());
        }

        var firstPage = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?page=1&pageSize=2");
        var secondPage = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?page=2&pageSize=2");

        firstPage.GetProperty("total").GetInt32().Should().Be(before + 3);
        firstPage.GetProperty("page").GetInt32().Should().Be(1);
        firstPage.GetProperty("pageSize").GetInt32().Should().Be(2);
        Items(firstPage).Select(o => o.GetProperty("number").GetInt32()).Should().Equal(numbers[2], numbers[1]);
        Items(secondPage)[0].GetProperty("number").GetInt32().Should().Be(numbers[0]);

        var newest = Items(firstPage)[0];
        newest.GetProperty("status").GetString().Should().Be("pending");
        newest.GetProperty("customerName").GetString().Should().Be("Ana Pérez");
        newest.GetProperty("phone").GetString().Should().Be("11 5555-0000");
        newest.GetProperty("zone").GetString().Should().Be("buenosAires");
        newest.GetProperty("itemCount").GetInt32().Should().Be(2);
        newest.GetProperty("totalUnits").GetInt32().Should().Be(4);
        newest.GetProperty("isWholesale").GetBoolean().Should().BeFalse();
        newest.GetProperty("hasUnpricedItems").GetBoolean().Should().BeTrue();
        Money(newest, "total").Should().Be(30m);
        newest.GetProperty("createdAt").GetDateTimeOffset().Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5));

        // Without parameters the list uses the default page size.
        var defaults = await product.Admin.GetFromJsonAsync<JsonElement>(AdminOrdersUrl);
        defaults.GetProperty("page").GetInt32().Should().Be(1);
        defaults.GetProperty("pageSize").GetInt32().Should().Be(20);
        // A page beyond the end is empty but still reports the total.
        var beyond = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?page=100000&pageSize=100");
        Items(beyond).Should().BeEmpty();
        beyond.GetProperty("total").GetInt32().Should().Be(before + 3);
    }

    [Fact]
    public async Task Admin_filters_orders_by_status()
    {
        await using var product = await CreateProduct();
        var cancelledBefore = await TotalOrders(product.Admin, "&status=cancelled");
        var kept = (await Created(BuenosAires((product.First, 1)))).GetProperty("id").GetInt32();
        var cancelled = (await Created(BuenosAires((product.First, 1)))).GetProperty("id").GetInt32();
        (await product.Admin.PatchAsJsonAsync($"{AdminOrdersUrl}/{cancelled}/status", new { status = "cancelled" })).EnsureSuccessStatusCode();

        var cancelledList = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?status=cancelled&pageSize=100");
        var pendingList = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?status=pending&pageSize=100");

        cancelledList.GetProperty("total").GetInt32().Should().Be(cancelledBefore + 1);
        Items(cancelledList).Should().OnlyContain(o => o.GetProperty("status").GetString() == "cancelled");
        Items(cancelledList).Select(o => o.GetProperty("id").GetInt32()).Should().Contain(cancelled).And.NotContain(kept);
        Items(pendingList).Should().OnlyContain(o => o.GetProperty("status").GetString() == "pending");
        Items(pendingList).Select(o => o.GetProperty("id").GetInt32()).Should().Contain(kept).And.NotContain(cancelled);
    }

    [Fact]
    public async Task Admin_list_exposes_the_delivery_location()
    {
        await using var product = await CreateProduct();
        var withCoords = (await Created(With(With(BuenosAires((product.First, 1)), "latitude", -34.65), "longitude", -58.62))).GetProperty("id").GetInt32();
        var addressOnly = (await Created(BuenosAires((product.First, 1)))).GetProperty("id").GetInt32();
        var carrier = (await Created(OtherProvince((product.First, 1)))).GetProperty("id").GetInt32();

        var list = Items(await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?pageSize=100"));
        JsonElement Find(int id) => list.Single(o => o.GetProperty("id").GetInt32() == id);

        var c = Find(withCoords);
        c.GetProperty("locality").GetString().Should().Be("Morón");
        c.GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        c.GetProperty("latitude").GetDouble().Should().Be(-34.65);
        c.GetProperty("longitude").GetDouble().Should().Be(-58.62);

        var a = Find(addressOnly);
        a.GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        a.GetProperty("latitude").ValueKind.Should().Be(JsonValueKind.Null);
        a.GetProperty("longitude").ValueKind.Should().Be(JsonValueKind.Null);

        var p = Find(carrier);
        p.GetProperty("locality").ValueKind.Should().Be(JsonValueKind.Null);
        p.GetProperty("address").ValueKind.Should().Be(JsonValueKind.Null);
        p.GetProperty("latitude").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Theory]
    [InlineData("?status=shipped")]
    [InlineData("?status=1")]
    [InlineData("?status=pending%27%20OR%201=1")]
    [InlineData("?page=0")]
    [InlineData("?page=abc")]
    [InlineData("?pageSize=0")]
    [InlineData("?pageSize=101")]
    public async Task Admin_list_rejects_invalid_parameters(string query)
    {
        (await AdminClient().GetAsync($"{AdminOrdersUrl}{query}")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Admin_reads_the_full_detail_of_both_zones()
    {
        await using var product = await CreateProduct();
        await product.SetPrices(product.First, 10m, 8m);
        var baBody = With(With(With(BuenosAires((product.First, 2)), "latitude", -34.65), "longitude", -58.62), "comments", "Tocar timbre.\nDepto B");
        var ba = await Created(baBody);
        var op = await Created(OtherProvince((product.First, 1), (product.Second, 3)));

        var baDetail = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{ba.GetProperty("id").GetInt32()}");
        var opDetail = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{op.GetProperty("id").GetInt32()}");

        baDetail.GetProperty("number").GetInt32().Should().Be(ba.GetProperty("number").GetInt32());
        baDetail.GetProperty("status").GetString().Should().Be("pending");
        baDetail.GetProperty("zone").GetString().Should().Be("buenosAires");
        baDetail.GetProperty("customerName").GetString().Should().Be("Ana Pérez");
        baDetail.GetProperty("phone").GetString().Should().Be("11 5555-0000");
        baDetail.GetProperty("locality").GetString().Should().Be("Morón");
        baDetail.GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        baDetail.GetProperty("latitude").GetDouble().Should().Be(-34.65);
        baDetail.GetProperty("longitude").GetDouble().Should().Be(-58.62);
        baDetail.GetProperty("province").ValueKind.Should().Be(JsonValueKind.Null);
        baDetail.GetProperty("carrier").ValueKind.Should().Be(JsonValueKind.Null);
        baDetail.GetProperty("comments").GetString().Should().Be("Tocar timbre.\nDepto B");
        baDetail.GetProperty("isWholesale").GetBoolean().Should().BeFalse();
        baDetail.GetProperty("hasUnpricedItems").GetBoolean().Should().BeFalse();
        Money(baDetail, "total").Should().Be(20m);
        baDetail.GetProperty("createdAt").GetDateTimeOffset().Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5));

        opDetail.GetProperty("zone").GetString().Should().Be("otherProvince");
        opDetail.GetProperty("province").GetString().Should().Be("Córdoba");
        opDetail.GetProperty("carrier").GetString().Should().Be("Expreso Lancioni");
        opDetail.GetProperty("locality").ValueKind.Should().Be(JsonValueKind.Null);
        opDetail.GetProperty("address").ValueKind.Should().Be(JsonValueKind.Null);
        opDetail.GetProperty("latitude").ValueKind.Should().Be(JsonValueKind.Null);
        opDetail.GetProperty("comments").ValueKind.Should().Be(JsonValueKind.Null);
        opDetail.GetProperty("hasUnpricedItems").GetBoolean().Should().BeTrue();
        var lines = Items(opDetail);
        lines.Should().HaveCount(2);
        lines[0].GetProperty("variantId").GetInt32().Should().Be(product.First);
        lines[0].GetProperty("id").GetInt32().Should().BePositive();
        lines[1].GetProperty("variantLabel").GetString().Should().Be($"{product.AttributeName} Second");
        lines[1].GetProperty("quantity").GetInt32().Should().Be(3);
        Money(lines[1], "unitPrice").Should().BeNull();

        (await product.Admin.GetAsync($"{AdminOrdersUrl}/{int.MaxValue}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Admin_moves_an_order_through_every_status()
    {
        await using var product = await CreateProduct();
        var id = (await Created(BuenosAires((product.First, 1)))).GetProperty("id").GetInt32();

        foreach (var status in new[] { "confirmed", "outForDelivery", "delivered", "cancelled", "pending" })
        {
            var res = await product.Admin.PatchAsJsonAsync($"{AdminOrdersUrl}/{id}/status", new { status });
            res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
            var updated = await res.Content.ReadFromJsonAsync<JsonElement>();
            updated.GetProperty("id").GetInt32().Should().Be(id);
            updated.GetProperty("status").GetString().Should().Be(status);

            (await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}")).GetProperty("status").GetString().Should().Be(status);
        }
    }

    [Theory]
    [InlineData("""{"status":"shipped"}""")]
    [InlineData("""{"status":""}""")]
    [InlineData("""{"status":1}""")]
    [InlineData("""{"status":null}""")]
    [InlineData("""{}""")]
    public async Task Status_update_rejects_invalid_values(string body)
    {
        await using var product = await CreateProduct();
        var id = (await Created(BuenosAires((product.First, 1)))).GetProperty("id").GetInt32();

        var res = await product.Admin.PatchAsync($"{AdminOrdersUrl}/{id}/status", new StringContent(body, Encoding.UTF8, "application/json"));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest, await res.Content.ReadAsStringAsync());
        (await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}")).GetProperty("status").GetString().Should().Be("pending");
    }

    [Fact]
    public async Task Status_update_of_an_unknown_order_is_not_found()
    {
        var res = await AdminClient().PatchAsJsonAsync($"{AdminOrdersUrl}/{int.MaxValue}/status", new { status = "confirmed" });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- Privacy and security ----

    [Theory]
    [InlineData("GET", "/api/admin/orders")]
    [InlineData("GET", "/api/admin/orders/1")]
    [InlineData("PATCH", "/api/admin/orders/1/status")]
    public async Task Admin_order_endpoints_require_a_token(string method, string url)
    {
        var req = new HttpRequestMessage(new HttpMethod(method), url);
        if (method == "PATCH") req.Content = JsonContent.Create(new { status = "confirmed" });

        (await _public.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("/api/orders", HttpStatusCode.MethodNotAllowed)]
    [InlineData("/api/orders/1", HttpStatusCode.NotFound)]
    [InlineData("/api/orders?page=1", HttpStatusCode.MethodNotAllowed)]
    public async Task Orders_cannot_be_read_through_public_endpoints(string url, HttpStatusCode expected)
    {
        await using var product = await CreateProduct();
        await Created(BuenosAires((product.First, 1)));

        var res = await _public.GetAsync(url);

        res.StatusCode.Should().Be(expected);
        (await res.Content.ReadAsStringAsync()).Should().NotContain("Ana Pérez");
    }

    [Fact]
    public async Task Text_fields_store_sql_payloads_literally()
    {
        await using var product = await CreateProduct();
        var before = await TotalOrders(product.Admin);
        const string name = "Robert'); DROP TABLE \"Orders\"; --";
        const string phone = "1' OR '1'='1";
        const string locality = "x'; DELETE FROM \"OrderItems\"; --";
        const string address = "1 UNION SELECT \"PasswordHash\" FROM \"AdminUsers\"";
        const string comments = "\\'; UPDATE \"Orders\" SET \"Total\" = 0; --\n1; SELECT pg_sleep(5)";
        var body = BuenosAires((product.First, 1));
        body["customerName"] = name;
        body["phone"] = phone;
        body["locality"] = locality;
        body["address"] = address;
        body["comments"] = comments;

        var id = (await Created(body)).GetProperty("id").GetInt32();
        var carrierId = (await Created(With(OtherProvince((product.First, 1)), "carrier", name))).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerName").GetString().Should().Be(name);
        stored.GetProperty("phone").GetString().Should().Be(phone);
        stored.GetProperty("locality").GetString().Should().Be(locality);
        stored.GetProperty("address").GetString().Should().Be(address);
        stored.GetProperty("comments").GetString().Should().Be(comments);
        (await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{carrierId}")).GetProperty("carrier").GetString().Should().Be(name);
        (await TotalOrders(product.Admin)).Should().Be(before + 2);
        (await product.Admin.GetFromJsonAsync<JsonElement>("/api/admin/products")).GetArrayLength().Should().BePositive();
    }
}
