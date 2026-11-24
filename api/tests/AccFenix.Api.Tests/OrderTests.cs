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
        var token = factory.AdminToken();
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

    static Dictionary<string, object?> Delivery(params (int VariantId, int Quantity)[] items) => new()
    {
        ["fulfillment"] = "delivery",
        ["customerType"] = "personal",
        ["customerName"] = "Ana Pérez",
        ["phone"] = "11 5555-0000",
        ["timeSlot"] = "Hoy 18:00 a 18:30",
        ["address"] = "Av. Siempre Viva 742",
        ["items"] = Lines(items),
    };

    static Dictionary<string, object?> Pickup(params (int VariantId, int Quantity)[] items) => new()
    {
        ["fulfillment"] = "pickup",
        ["customerType"] = "personal",
        ["customerName"] = "Luis Gómez",
        ["phone"] = "11 4444-0000",
        ["timeSlot"] = "Hoy 19:00 a 19:30",
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

    async Task<int> TotalOrders(HttpClient admin, string query = "") =>
        (await admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?pageSize=1{query}")).GetProperty("total").GetInt32();

    /// <summary>A product with one attribute and two values, hence two variants ("First" and "Second").</summary>
    sealed record TestProduct(HttpClient Admin, int AttributeId, int CategoryId, int ProductId, string Name, string AttributeName, int First, int Second) : IAsyncDisposable
    {
        public async Task SetPrice(int variantId, decimal? retailPrice) =>
            (await Admin.PatchAsJsonAsync($"/api/admin/variants/{variantId}", new { retailPrice })).EnsureSuccessStatusCode();

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
    public async Task Order_uses_retail_prices()
    {
        await using var product = await CreateProduct();
        await product.SetPrice(product.First, 100m);
        const int quantity = 99;

        var order = await Created(Delivery((product.First, quantity)));

        order.GetProperty("id").GetInt32().Should().BePositive();
        order.GetProperty("number").GetInt32().Should().BePositive();
        order.GetProperty("status").GetString().Should().Be("pending");
        order.GetProperty("paymentStatus").GetString().Should().Be("unpaid");
        order.GetProperty("checkoutUrl").ValueKind.Should().Be(JsonValueKind.Null, "Mercado Pago is not configured in tests");
        order.TryGetProperty("isWholesale", out _).Should().BeFalse();
        order.GetProperty("hasUnpricedItems").GetBoolean().Should().BeFalse();
        Money(order, "total").Should().Be(100m * quantity);

        var line = Items(order).Should().ContainSingle().Subject;
        line.GetProperty("variantId").GetInt32().Should().Be(product.First);
        line.GetProperty("productName").GetString().Should().Be(product.Name);
        line.GetProperty("sku").GetString().Should().Be(await product.Sku(product.First));
        line.GetProperty("variantLabel").GetString().Should().Be($"{product.AttributeName} First");
        line.GetProperty("quantity").GetInt32().Should().Be(quantity);
        Money(line, "unitPrice").Should().Be(100m);
        Money(line, "subtotal").Should().Be(100m * quantity);

        // The public response never echoes the customer's personal data.
        order.TryGetProperty("phone", out _).Should().BeFalse();
        order.TryGetProperty("customerName", out _).Should().BeFalse();
        order.TryGetProperty("address", out _).Should().BeFalse();
        order.TryGetProperty("timeSlot", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Large_multi_line_order_keeps_retail_prices()
    {
        await using var product = await CreateProduct();
        await product.SetPrice(product.First, 100m);
        await product.SetPrice(product.Second, 60m);

        // ColdCup has one price list, whatever the size of the order.
        var order = await Created(Delivery((product.First, 500), (product.Second, 500)));

        order.TryGetProperty("isWholesale", out _).Should().BeFalse();
        var lines = Items(order).ToDictionary(l => l.GetProperty("variantId").GetInt32());
        Money(lines[product.First], "unitPrice").Should().Be(100m);
        Money(lines[product.First], "subtotal").Should().Be(50_000m);
        Money(lines[product.Second], "unitPrice").Should().Be(60m);
        Money(order, "total").Should().Be(80_000m);
    }

    [Fact]
    public async Task Unpriced_variants_have_null_line_prices_and_flag_the_order()
    {
        await using var product = await CreateProduct();
        await product.SetPrice(product.First, 10m);
        await product.SetPrice(product.Second, null);

        var order = await Created(Delivery((product.First, 3), (product.Second, 4)));

        order.TryGetProperty("isWholesale", out _).Should().BeFalse();
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
        await product.SetPrice(product.First, 100m);
        var sku = await product.Sku(product.First);
        var id = (await Created(Delivery((product.First, 2)))).GetProperty("id").GetInt32();

        await product.SetPrice(product.First, 999m);
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

        var first = (await Created(Delivery((product.First, 1)))).GetProperty("number").GetInt32();
        var second = (await Created(Pickup((product.Second, 1)))).GetProperty("number").GetInt32();
        var third = (await Created(Delivery((product.First, 1)))).GetProperty("number").GetInt32();

        second.Should().Be(first + 1);
        third.Should().Be(first + 2);
    }

    [Fact]
    public async Task Prices_and_server_fields_sent_by_the_client_are_ignored()
    {
        await using var product = await CreateProduct();
        await product.SetPrice(product.First, 100m);

        var res = await PostOrder($$"""
            {"fulfillment":"delivery","customerType":"personal","customerName":"Ana","phone":"11 5555-0000","timeSlot":"Hoy 18:00","address":"Calle 1",
             "id":999999,"number":999999,"status":"delivered","paymentStatus":"approved","paidAt":"2026-01-01T00:00:00Z","mercadoPagoPaymentId":"fake",
             "isWholesale":true,"total":1,"hasUnpricedItems":true,
             "items":[{"variantId":{{product.First}},"quantity":2,"unitPrice":0.01,"subtotal":0.02,"wholesalePrice":0.01,"productName":"Fake","sku":"FAKE"}]}
            """);

        res.StatusCode.Should().Be(HttpStatusCode.Created, await res.Content.ReadAsStringAsync());
        var order = await res.Content.ReadFromJsonAsync<JsonElement>();
        order.GetProperty("number").GetInt32().Should().NotBe(999999);
        order.GetProperty("status").GetString().Should().Be("pending");
        order.GetProperty("paymentStatus").GetString().Should().Be("unpaid");
        order.TryGetProperty("isWholesale", out _).Should().BeFalse();
        order.GetProperty("hasUnpricedItems").GetBoolean().Should().BeFalse();
        Money(order, "total").Should().Be(200m);
        var line = Items(order).Single();
        Money(line, "unitPrice").Should().Be(100m);
        line.GetProperty("productName").GetString().Should().Be(product.Name);

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{order.GetProperty("id").GetInt32()}");
        Money(stored, "total").Should().Be(200m);
        stored.GetProperty("status").GetString().Should().Be("pending");
        stored.GetProperty("paymentStatus").GetString().Should().Be("unpaid");
        stored.GetProperty("paidAt").ValueKind.Should().Be(JsonValueKind.Null);
        stored.GetProperty("mercadoPagoPaymentId").ValueKind.Should().Be(JsonValueKind.Null);
    }

    // ---- Validation ----

    [Fact]
    public async Task Invalid_orders_are_rejected_and_nothing_is_stored()
    {
        await using var product = await CreateProduct();
        var delivery = Delivery((product.First, 1));
        var pickup = Pickup((product.First, 1));
        var long121 = new string('a', 121);
        var long201 = new string('a', 201);
        var long61 = new string('a', 61);
        var before = await TotalOrders(product.Admin);

        var cases = new Dictionary<string, Dictionary<string, object?>>
        {
            ["missing fulfillment"] = Without(delivery, "fulfillment"),
            ["null fulfillment"] = With(delivery, "fulfillment", null),
            ["unknown fulfillment"] = With(delivery, "fulfillment", "mars"),
            ["numeric fulfillment"] = With(delivery, "fulfillment", 0),

            ["missing customer type"] = Without(delivery, "customerType"),
            ["null customer type"] = With(delivery, "customerType", null),
            ["unknown customer type"] = With(delivery, "customerType", "company"),
            ["numeric customer type"] = With(delivery, "customerType", 1),

            ["delivery: missing name"] = Without(delivery, "customerName"),
            ["delivery: blank name"] = With(delivery, "customerName", "   "),
            ["delivery: name too long"] = With(delivery, "customerName", long121),
            ["delivery: name with a line break"] = With(delivery, "customerName", "Ana\nPérez"),
            ["delivery: phone too long"] = With(delivery, "phone", new string('1', 41)),
            ["delivery: phone with a line break"] = With(delivery, "phone", "11\n5555-0000"),
            ["delivery: missing time slot"] = Without(delivery, "timeSlot"),
            ["delivery: blank time slot"] = With(delivery, "timeSlot", "   "),
            ["delivery: time slot too long"] = With(delivery, "timeSlot", long61),
            ["delivery: time slot with a line break"] = With(delivery, "timeSlot", "Hoy\n18:00"),
            ["delivery: missing address"] = Without(delivery, "address"),
            ["delivery: blank address"] = With(delivery, "address", " "),
            ["delivery: address too long"] = With(delivery, "address", long201),
            ["delivery: address with a line break"] = With(delivery, "address", "Calle\n1"),
            ["delivery: comments too long"] = With(delivery, "comments", new string('a', 501)),
            ["delivery: comments with a null character"] = With(delivery, "comments", "a\0b"),
            ["delivery: latitude out of range"] = With(With(delivery, "latitude", 90.01), "longitude", 10),
            ["delivery: longitude out of range"] = With(With(delivery, "latitude", 10), "longitude", -180.01),
            ["delivery: latitude without longitude"] = With(delivery, "latitude", -34.6),
            ["delivery: longitude without latitude"] = With(delivery, "longitude", -58.4),

            ["pickup: missing name"] = Without(pickup, "customerName"),
            ["pickup: phone too long once trimmed"] = With(pickup, "phone", $"  {new string('1', 41)}  "),
            ["pickup: missing time slot"] = Without(pickup, "timeSlot"),
            ["pickup: blank time slot"] = With(pickup, "timeSlot", ""),
            ["pickup: time slot too long"] = With(pickup, "timeSlot", long61),
            ["pickup: comments too long"] = With(pickup, "comments", new string('a', 501)),
            ["pickup: address belongs to delivery"] = With(pickup, "address", "Calle 1"),
            ["pickup: blank address belongs to delivery"] = With(pickup, "address", ""),
            ["pickup: latitude belongs to delivery"] = With(pickup, "latitude", -34.6),
            ["pickup: longitude belongs to delivery"] = With(pickup, "longitude", -58.4),
            ["pickup: coordinates belong to delivery"] = With(With(pickup, "latitude", -34.6), "longitude", -58.4),

            ["missing items"] = Without(delivery, "items"),
            ["no lines"] = With(delivery, "items", Lines()),
            ["null line"] = With(delivery, "items", new object?[] { null }),
            ["too many lines"] = With(delivery, "items", Lines(Enumerable.Range(1, 101).Select(i => (i, 1)).ToArray())),
            ["duplicate variants"] = With(delivery, "items", Lines((product.First, 1), (product.Second, 1), (product.First, 2))),
            ["quantity zero"] = With(delivery, "items", Lines((product.First, 0))),
            ["negative quantity"] = With(delivery, "items", Lines((product.First, -5))),
            ["quantity above the maximum"] = With(delivery, "items", Lines((product.First, 100_001))),
            ["variant id zero"] = With(delivery, "items", Lines((0, 1))),
            ["unknown variant"] = With(delivery, "items", Lines((product.First, 1), (int.MaxValue, 1))),
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

        var res = await PostOrder(With(With(Delivery((product.First, 0)), "phone", new string('1', 41)), "address", ""));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.EnumerateObject().Select(e => e.Name).Should().Contain(new[] { "Phone", "Address", "Items[0].Quantity" });
    }

    [Fact]
    public async Task Inactive_variants_and_products_cannot_be_ordered()
    {
        await using var product = await CreateProduct();
        (await product.Admin.PatchAsJsonAsync($"/api/admin/variants/{product.Second}", new { isActive = false })).EnsureSuccessStatusCode();

        (await PostOrder(Delivery((product.First, 1), (product.Second, 1)))).StatusCode.Should().Be(HttpStatusCode.BadRequest, "the second variant is inactive");
        (await PostOrder(Delivery((product.First, 1)))).StatusCode.Should().Be(HttpStatusCode.Created, "the first variant is still active");

        await product.SetProductActive(false);
        (await PostOrder(Delivery((product.First, 1)))).StatusCode.Should().Be(HttpStatusCode.BadRequest, "the product is inactive");
    }

    [Fact]
    public async Task Order_whose_total_does_not_fit_the_money_column_is_rejected()
    {
        await using var product = await CreateProduct();
        await product.SetPrice(product.First, 99_999_999m);

        var res = await PostOrder(Delivery((product.First, 100_000)));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest, await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Boundary_values_are_accepted_and_text_is_trimmed()
    {
        await using var product = await CreateProduct();
        var body = Delivery((product.First, 100_000));
        body["customerName"] = $"  {new string('n', 120)}  ";
        body["phone"] = new string('1', 40);
        body["timeSlot"] = $"  {new string('t', 60)}  ";
        body["address"] = new string('d', 200);
        body["comments"] = $"{new string('c', 249)}\n{new string('c', 250)}";
        body["latitude"] = -90;
        body["longitude"] = 180;

        var id = (await Created(body)).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerName").GetString().Should().Be(new string('n', 120));
        stored.GetProperty("timeSlot").GetString().Should().Be(new string('t', 60));
        stored.GetProperty("address").GetString().Should().Be(new string('d', 200));
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

        var id = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerType").GetString().Should().Be("personal");
        stored.TryGetProperty("businessName", out _).Should().BeFalse("orders no longer record a business name");
    }

    [Fact]
    public async Task Business_order_needs_no_business_name()
    {
        await using var product = await CreateProduct();

        var id = (await Created(Business(Pickup((product.First, 1))))).GetProperty("id").GetInt32();

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

        var body = With(Business(Delivery((product.First, 1))), "businessName", businessName);
        var id = (await Created(body)).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerType").GetString().Should().Be("business");
        stored.TryGetProperty("businessName", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Admin_list_shows_the_customer_type()
    {
        await using var product = await CreateProduct();
        var personal = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();
        var business = (await Created(Business(Delivery((product.First, 1))))).GetProperty("id").GetInt32();

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
        // The phone is optional: blank values are stored as null.
        var body = phone switch
        {
            "absent" => Without(Delivery((product.First, 1)), "phone"),
            "null" => With(Delivery((product.First, 1)), "phone", null),
            _ => With(Delivery((product.First, 1)), "phone", phone),
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

        var id = (await Created(With(Pickup((product.First, 1)), "phone", "  11 4444-0000  "))).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("phone").GetString().Should().Be("11 4444-0000");
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
            var body = i % 2 == 0 ? Delivery((product.First, 1)) : With(Delivery((product.First, 1)), "address", "");
            (await PostOrder(body, visitor)).StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.BadRequest);
        }
        (await PostOrder(Delivery((product.First, 1)), visitor)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        // Another visitor is not affected.
        (await PostOrder(Delivery((product.First, 1)))).StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Forwarded_ip_does_not_grant_a_new_quota_without_the_shared_key()
    {
        await using var product = await CreateProduct();
        var statuses = new List<HttpStatusCode>();

        // Without the key every request counts against the connection, whatever the header says.
        for (var i = 0; i <= RateLimit; i++)
        {
            var req = new HttpRequestMessage(HttpMethod.Post, OrdersUrl) { Content = JsonContent.Create(Delivery((product.First, 1))) };
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
        await product.SetPrice(product.First, 10m);
        var before = await TotalOrders(product.Admin);
        var numbers = new List<int>();
        for (var i = 1; i <= 3; i++)
        {
            numbers.Add((await Created(Delivery((product.First, i), (product.Second, 1)))).GetProperty("number").GetInt32());
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
        newest.GetProperty("fulfillment").GetString().Should().Be("delivery");
        newest.GetProperty("timeSlot").GetString().Should().Be("Hoy 18:00 a 18:30");
        newest.GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        newest.GetProperty("paymentStatus").GetString().Should().Be("unpaid");
        newest.GetProperty("paidAt").ValueKind.Should().Be(JsonValueKind.Null);
        newest.GetProperty("itemCount").GetInt32().Should().Be(2);
        newest.GetProperty("totalUnits").GetInt32().Should().Be(4);
        newest.TryGetProperty("isWholesale", out _).Should().BeFalse();
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
        var kept = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();
        var cancelled = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();
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
    public async Task Admin_exposes_the_delivery_location()
    {
        await using var product = await CreateProduct();
        var withCoords = (await Created(With(With(Delivery((product.First, 1)), "latitude", -34.65), "longitude", -58.62))).GetProperty("id").GetInt32();
        var addressOnly = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();
        var pickup = (await Created(Pickup((product.First, 1)))).GetProperty("id").GetInt32();

        var list = Items(await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}?pageSize=100"));
        JsonElement Find(int id) => list.Single(o => o.GetProperty("id").GetInt32() == id);
        Task<JsonElement> Detail(int id) => product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");

        // The list carries the address; the map point is read from the order detail.
        Find(withCoords).GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        var c = await Detail(withCoords);
        c.GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        c.GetProperty("latitude").GetDouble().Should().Be(-34.65);
        c.GetProperty("longitude").GetDouble().Should().Be(-58.62);

        Find(addressOnly).GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        var a = await Detail(addressOnly);
        a.GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        a.GetProperty("latitude").ValueKind.Should().Be(JsonValueKind.Null);
        a.GetProperty("longitude").ValueKind.Should().Be(JsonValueKind.Null);

        Find(pickup).GetProperty("address").ValueKind.Should().Be(JsonValueKind.Null);
        var p = await Detail(pickup);
        p.GetProperty("address").ValueKind.Should().Be(JsonValueKind.Null);
        p.GetProperty("latitude").ValueKind.Should().Be(JsonValueKind.Null);
        p.GetProperty("longitude").ValueKind.Should().Be(JsonValueKind.Null);
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
    public async Task Admin_reads_the_full_detail_of_both_fulfillments()
    {
        await using var product = await CreateProduct();
        await product.SetPrice(product.First, 10m);
        var deliveryBody = With(With(With(Delivery((product.First, 2)), "latitude", -34.65), "longitude", -58.62), "comments", "Tocar timbre.\nDepto B");
        var delivery = await Created(deliveryBody);
        var pickup = await Created(Pickup((product.First, 1), (product.Second, 3)));

        var deliveryDetail = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{delivery.GetProperty("id").GetInt32()}");
        var pickupDetail = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{pickup.GetProperty("id").GetInt32()}");

        deliveryDetail.GetProperty("number").GetInt32().Should().Be(delivery.GetProperty("number").GetInt32());
        deliveryDetail.GetProperty("status").GetString().Should().Be("pending");
        deliveryDetail.GetProperty("fulfillment").GetString().Should().Be("delivery");
        deliveryDetail.GetProperty("customerName").GetString().Should().Be("Ana Pérez");
        deliveryDetail.GetProperty("phone").GetString().Should().Be("11 5555-0000");
        deliveryDetail.GetProperty("timeSlot").GetString().Should().Be("Hoy 18:00 a 18:30");
        deliveryDetail.GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        deliveryDetail.GetProperty("latitude").GetDouble().Should().Be(-34.65);
        deliveryDetail.GetProperty("longitude").GetDouble().Should().Be(-58.62);
        deliveryDetail.GetProperty("comments").GetString().Should().Be("Tocar timbre.\nDepto B");
        deliveryDetail.GetProperty("paymentStatus").GetString().Should().Be("unpaid");
        deliveryDetail.GetProperty("mercadoPagoPaymentId").ValueKind.Should().Be(JsonValueKind.Null);
        deliveryDetail.GetProperty("paidAt").ValueKind.Should().Be(JsonValueKind.Null);
        deliveryDetail.TryGetProperty("isWholesale", out _).Should().BeFalse();
        deliveryDetail.GetProperty("hasUnpricedItems").GetBoolean().Should().BeFalse();
        Money(deliveryDetail, "total").Should().Be(20m);
        deliveryDetail.GetProperty("createdAt").GetDateTimeOffset().Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5));

        pickupDetail.GetProperty("fulfillment").GetString().Should().Be("pickup");
        pickupDetail.GetProperty("timeSlot").GetString().Should().Be("Hoy 19:00 a 19:30");
        pickupDetail.GetProperty("address").ValueKind.Should().Be(JsonValueKind.Null);
        pickupDetail.GetProperty("latitude").ValueKind.Should().Be(JsonValueKind.Null);
        pickupDetail.GetProperty("longitude").ValueKind.Should().Be(JsonValueKind.Null);
        pickupDetail.GetProperty("comments").ValueKind.Should().Be(JsonValueKind.Null);
        pickupDetail.GetProperty("hasUnpricedItems").GetBoolean().Should().BeTrue();
        var lines = Items(pickupDetail);
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
        var id = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();

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
        var id = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();

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

    // ---- Delivery location ----

    Task<HttpResponseMessage> PatchLocation(HttpClient admin, int id, object body) =>
        admin.PatchAsJsonAsync($"{AdminOrdersUrl}/{id}/location", body);

    [Fact]
    public async Task Admin_updates_the_location_and_sets_the_map_point()
    {
        await using var product = await CreateProduct();
        var id = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();

        var res = await PatchLocation(product.Admin, id, new { address = " Arias 2100 ", latitude = -34.651, longitude = -58.644 });

        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
        var updated = await res.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("id").GetInt32().Should().Be(id);
        updated.GetProperty("address").GetString().Should().Be("Arias 2100");
        updated.GetProperty("latitude").GetDouble().Should().Be(-34.651);
        updated.GetProperty("longitude").GetDouble().Should().Be(-58.644);
        Items(updated).Should().HaveCount(1);

        var detail = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        detail.GetProperty("address").GetString().Should().Be("Arias 2100");
        detail.GetProperty("latitude").GetDouble().Should().Be(-34.651);
        detail.GetProperty("customerName").GetString().Should().Be("Ana Pérez");
    }

    [Fact]
    public async Task Admin_removes_the_map_point_by_omitting_the_coordinates()
    {
        await using var product = await CreateProduct();
        var id = (await Created(With(With(Delivery((product.First, 1)), "latitude", -34.65), "longitude", -58.62))).GetProperty("id").GetInt32();

        var res = await PatchLocation(product.Admin, id, new { address = "Av. Siempre Viva 742", latitude = (double?)null, longitude = (double?)null });

        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
        var detail = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        detail.GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
        detail.GetProperty("latitude").ValueKind.Should().Be(JsonValueKind.Null);
        detail.GetProperty("longitude").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Location_update_of_an_unknown_order_is_not_found()
    {
        var res = await PatchLocation(AdminClient(), int.MaxValue, new { address = "Rivadavia 1" });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    /// <summary>Pickup orders have no address: the order's own state forbids the change, hence 409.</summary>
    [Fact]
    public async Task Location_of_a_pickup_order_cannot_be_edited()
    {
        await using var product = await CreateProduct();
        var id = (await Created(Pickup((product.First, 1)))).GetProperty("id").GetInt32();

        var res = await PatchLocation(product.Admin, id, new { address = "Rivadavia 1" });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict, await res.Content.ReadAsStringAsync());
        var detail = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        detail.GetProperty("address").ValueKind.Should().Be(JsonValueKind.Null);
        detail.GetProperty("fulfillment").GetString().Should().Be("pickup");
    }

    [Theory]
    [InlineData("""{}""", "Address")]
    [InlineData("""{"address":"  "}""", "Address")]
    [InlineData("""{"address":"Rivadavia\n1"}""", "Address")]
    [InlineData("""{"address":"Rivadavia 1","latitude":-34.6}""", "Longitude")]
    [InlineData("""{"address":"Rivadavia 1","latitude":91,"longitude":-58}""", "Latitude")]
    [InlineData("""{"address":"Rivadavia 1","latitude":-34,"longitude":181}""", "Longitude")]
    public async Task Location_update_rejects_invalid_input(string body, string field)
    {
        await using var product = await CreateProduct();
        var id = (await Created(Delivery((product.First, 1)))).GetProperty("id").GetInt32();

        var res = await product.Admin.PatchAsync($"{AdminOrdersUrl}/{id}/location", new StringContent(body, Encoding.UTF8, "application/json"));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest, await res.Content.ReadAsStringAsync());
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.EnumerateObject().Select(e => e.Name).Should().Contain(field);
        (await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}")).GetProperty("address").GetString().Should().Be("Av. Siempre Viva 742");
    }

    // ---- Privacy and security ----

    [Theory]
    [InlineData("GET", "/api/admin/orders")]
    [InlineData("GET", "/api/admin/orders/1")]
    [InlineData("PATCH", "/api/admin/orders/1/status")]
    [InlineData("PATCH", "/api/admin/orders/1/location")]
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
        await Created(Delivery((product.First, 1)));

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
        const string timeSlot = "x'; DELETE FROM \"OrderItems\"; --";
        const string address = "1 UNION SELECT \"PasswordHash\" FROM \"AdminUsers\"";
        const string comments = "\\'; UPDATE \"Orders\" SET \"Total\" = 0; --\n1; SELECT pg_sleep(5)";
        var body = Delivery((product.First, 1));
        body["customerName"] = name;
        body["phone"] = phone;
        body["timeSlot"] = timeSlot;
        body["address"] = address;
        body["comments"] = comments;

        var id = (await Created(body)).GetProperty("id").GetInt32();
        var pickupId = (await Created(With(Pickup((product.First, 1)), "timeSlot", name))).GetProperty("id").GetInt32();

        var stored = await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{id}");
        stored.GetProperty("customerName").GetString().Should().Be(name);
        stored.GetProperty("phone").GetString().Should().Be(phone);
        stored.GetProperty("timeSlot").GetString().Should().Be(timeSlot);
        stored.GetProperty("address").GetString().Should().Be(address);
        stored.GetProperty("comments").GetString().Should().Be(comments);
        (await product.Admin.GetFromJsonAsync<JsonElement>($"{AdminOrdersUrl}/{pickupId}")).GetProperty("timeSlot").GetString().Should().Be(name);
        (await TotalOrders(product.Admin)).Should().Be(before + 2);
        (await product.Admin.GetFromJsonAsync<JsonElement>("/api/admin/products")).GetArrayLength().Should().BePositive();
    }
}
