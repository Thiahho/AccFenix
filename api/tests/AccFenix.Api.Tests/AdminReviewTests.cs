using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

/// <summary>
/// Reviews registered from the admin panel: they follow the public flow's rules (paid order, product of the order,
/// one per product and order) and show up on the public product page right away.
/// Every test works on its own throwaway product and orders.
/// </summary>
[Collection(ApiCollection.Name)]
public class AdminReviewTests(ApiFactory factory)
{
    const string ReviewsUrl = "/api/admin/reviews";

    static int _visitor;

    async Task<HttpClient> AdminClient()
    {
        var client = factory.CreateClient();
        // Each login comes from its own trusted visitor IP, so the class does not exhaust the per-visitor login quota.
        var login = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword }),
        };
        login.Headers.Add(ClientIp.IpHeader, $"198.51.101.{Interlocked.Increment(ref _visitor) % 254 + 1}");
        login.Headers.Add(ClientIp.KeyHeader, ApiFactory.TrustedWebKey);
        var res = await client.SendAsync(login);
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

    /// <summary>An active product with two variants, in its own category.</summary>
    sealed record TestProduct(HttpClient Admin, int AttributeId, int CategoryId, int ProductId, string Name, string Slug, int First, int Second) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await Admin.DeleteAsync($"/api/admin/products/{ProductId}");
            await Admin.DeleteAsync($"/api/admin/categories/{CategoryId}");
            await Admin.DeleteAsync($"/api/admin/attributes/{AttributeId}");
        }
    }

    async Task<TestProduct> CreateProduct(HttpClient admin)
    {
        var name = $"review-test-{Guid.NewGuid():N}";
        var attributeId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/attributes", new { name = $"attr-{name}", sortOrder = 50 }));
        var firstValue = await CreatedId(await admin.PostAsJsonAsync($"/api/admin/attributes/{attributeId}/values", new { label = "First", sortOrder = 0 }));
        var secondValue = await CreatedId(await admin.PostAsJsonAsync($"/api/admin/attributes/{attributeId}/values", new { label = "Second", sortOrder = 1 }));
        var categoryId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/categories",
            new { name = $"cat-{name}", sortOrder = 50, isActive = true, attributeIds = new[] { attributeId } }));
        var productId = await CreatedId(await admin.PostAsJsonAsync("/api/admin/products",
            new { categoryId, name, sortOrder = 0, isActive = true, allowedValueIds = new[] { firstValue, secondValue } }));

        var detail = await admin.GetFromJsonAsync<JsonElement>($"/api/admin/products/{productId}");
        var variants = detail.GetProperty("variants").EnumerateArray().ToList();
        int VariantOf(int valueId) => variants.Single(v => v.GetProperty("valueIds").EnumerateArray().Any(x => x.GetInt32() == valueId)).GetProperty("id").GetInt32();
        return new TestProduct(admin, attributeId, categoryId, productId, name, detail.GetProperty("slug").GetString()!, VariantOf(firstValue), VariantOf(secondValue));
    }

    /// <summary>Saves an order straight into the database and returns its number.</summary>
    async Task<int> CreateOrder(PaymentStatus payment, params int[] variantIds)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var order = new Order
        {
            CreatedAt = DateTime.UtcNow,
            CustomerName = "Marta Fernández",
            Fulfillment = Fulfillment.Pickup,
            TimeSlot = "Hoy 18:00 a 18:30",
            PaymentStatus = payment,
            PaidAt = payment is PaymentStatus.Approved or PaymentStatus.Refunded ? DateTime.UtcNow : null,
            Total = 10m * variantIds.Length,
            Items = variantIds.Select(v => new OrderItem
            {
                VariantId = v,
                ProductName = "Product",
                Sku = $"SKU-{v}",
                VariantLabel = "Label",
                Quantity = 1,
                UnitPrice = 10m,
                Subtotal = 10m,
            }).ToList(),
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        await db.Entry(order).ReloadAsync();
        return order.Number;
    }

    static object Review(int orderNumber, int productId, int rating = 5, string? comment = "Muy rico", string? authorName = null) =>
        new { orderNumber, productId, rating, comment, authorName };

    async Task<List<JsonElement>> PublicReviews(string slug) =>
        (await factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/products/{slug}"))
            .GetProperty("reviews").EnumerateArray().ToList();

    [Theory]
    [InlineData("GET", ReviewsUrl)]
    [InlineData("GET", ReviewsUrl + "/order/1")]
    [InlineData("POST", ReviewsUrl)]
    [InlineData("DELETE", ReviewsUrl + "/1")]
    public async Task Admin_review_endpoints_require_a_token(string method, string url)
    {
        var res = await factory.CreateClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), url) { Content = JsonContent.Create(new { }) });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Review_for_a_paid_order_is_listed_and_published()
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        var number = await CreateOrder(PaymentStatus.Approved, product.First);

        var res = await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId, rating: 4, comment: "  Muy rico  "));
        var id = await CreatedId(res);

        // The author defaults to the customer's first name, the only part of the name that is ever public.
        var published = (await PublicReviews(product.Slug)).Should().ContainSingle().Subject;
        published.GetProperty("authorName").GetString().Should().Be("Marta");
        published.GetProperty("rating").GetInt32().Should().Be(4);
        published.GetProperty("comment").GetString().Should().Be("Muy rico");

        var listed = (await admin.GetFromJsonAsync<JsonElement>(ReviewsUrl)).EnumerateArray().Single(r => r.GetProperty("id").GetInt32() == id);
        listed.GetProperty("productId").GetInt32().Should().Be(product.ProductId);
        listed.GetProperty("productName").GetString().Should().Be(product.Name);
        listed.GetProperty("productSlug").GetString().Should().Be(product.Slug);
        listed.GetProperty("orderNumber").GetInt32().Should().Be(number);
        listed.GetProperty("authorName").GetString().Should().Be("Marta");
    }

    [Fact]
    public async Task List_is_newest_first()
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        var number = await CreateOrder(PaymentStatus.Approved, product.First);
        var older = await CreatedId(await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId)));
        var other = await CreateOrder(PaymentStatus.Approved, product.First);
        var newer = await CreatedId(await admin.PostAsJsonAsync(ReviewsUrl, Review(other, product.ProductId)));

        var ids = (await admin.GetFromJsonAsync<JsonElement>(ReviewsUrl)).EnumerateArray().Select(r => r.GetProperty("id").GetInt32()).ToList();

        ids.IndexOf(newer).Should().BeLessThan(ids.IndexOf(older));
    }

    [Theory]
    [InlineData(" Martita ", "Martita")]
    [InlineData("María José", "María José")]
    [InlineData("  María   José ", "María José")]
    public async Task Custom_author_name_is_used(string authorName, string expected)
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        var number = await CreateOrder(PaymentStatus.Approved, product.First);

        await CreatedId(await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId, authorName: authorName)));

        (await PublicReviews(product.Slug)).Should().ContainSingle().Which.GetProperty("authorName").GetString().Should().Be(expected);
    }

    [Theory]
    [InlineData(PaymentStatus.Unpaid)]
    [InlineData(PaymentStatus.Refunded)]
    public async Task Order_without_an_approved_payment_is_rejected(PaymentStatus payment)
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        var number = await CreateOrder(payment, product.First);

        var res = await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await PublicReviews(product.Slug)).Should().BeEmpty();
    }

    [Fact]
    public async Task Unknown_order_is_not_found()
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);

        var res = await admin.PostAsJsonAsync(ReviewsUrl, Review(int.MaxValue, product.ProductId));

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Product_not_in_the_order_is_rejected()
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        await using var other = await CreateProduct(admin);
        var number = await CreateOrder(PaymentStatus.Approved, product.First);

        var res = await admin.PostAsJsonAsync(ReviewsUrl, Review(number, other.ProductId));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await PublicReviews(other.Slug)).Should().BeEmpty();
    }

    [Fact]
    public async Task Second_review_of_the_same_product_and_order_is_a_conflict()
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        // Two variants of the same product are still one product to review.
        var number = await CreateOrder(PaymentStatus.Approved, product.First, product.Second);
        await CreatedId(await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId)));

        var res = await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId, rating: 1));

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await PublicReviews(product.Slug)).Should().ContainSingle().Which.GetProperty("rating").GetInt32().Should().Be(5);
    }

    [Theory]
    [InlineData(0, null, null)]
    [InlineData(6, null, null)]
    [InlineData(5, null, "Ana\nMaría")]
    [InlineData(5, null, "   ")]
    [InlineData(5, "long", null)]
    [InlineData(5, null, "long")]
    public async Task Invalid_review_is_rejected(int rating, string? comment, string? authorName)
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        var number = await CreateOrder(PaymentStatus.Approved, product.First);
        comment = comment == "long" ? new string('a', Domain.Review.CommentMaxLength + 1) : comment;
        authorName = authorName == "long" ? new string('a', Domain.Review.AuthorMaxLength + 1) : authorName;

        var res = await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId, rating, comment, authorName));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await PublicReviews(product.Slug)).Should().BeEmpty();
    }

    [Fact]
    public async Task Deleted_review_disappears()
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        var number = await CreateOrder(PaymentStatus.Approved, product.First);
        var id = await CreatedId(await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId)));

        (await admin.DeleteAsync($"{ReviewsUrl}/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await PublicReviews(product.Slug)).Should().BeEmpty();
        (await admin.GetFromJsonAsync<JsonElement>(ReviewsUrl)).EnumerateArray().Should().NotContain(r => r.GetProperty("id").GetInt32() == id);
        (await admin.DeleteAsync($"{ReviewsUrl}/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        // Once deleted, the product can be reviewed again for that order.
        await CreatedId(await admin.PostAsJsonAsync(ReviewsUrl, Review(number, product.ProductId)));
    }

    [Fact]
    public async Task Order_lookup_lists_its_products_and_flags_the_reviewed_ones()
    {
        var admin = await AdminClient();
        await using var first = await CreateProduct(admin);
        await using var second = await CreateProduct(admin);
        var number = await CreateOrder(PaymentStatus.Approved, first.First, first.Second, second.First);
        await CreatedId(await admin.PostAsJsonAsync(ReviewsUrl, Review(number, first.ProductId, rating: 3, comment: "Bien")));

        var order = await admin.GetFromJsonAsync<JsonElement>($"{ReviewsUrl}/order/{number}");

        order.GetProperty("number").GetInt32().Should().Be(number);
        order.GetProperty("authorName").GetString().Should().Be("Marta");
        var products = order.GetProperty("products").EnumerateArray().ToList();
        products.Should().HaveCount(2);
        var reviewed = products.Single(p => p.GetProperty("productId").GetInt32() == first.ProductId);
        reviewed.GetProperty("name").GetString().Should().Be(first.Name);
        reviewed.GetProperty("rating").GetInt32().Should().Be(3);
        reviewed.GetProperty("comment").GetString().Should().Be("Bien");
        var pending = products.Single(p => p.GetProperty("productId").GetInt32() == second.ProductId);
        pending.GetProperty("rating").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Order_lookup_rejects_unknown_and_unpaid_orders()
    {
        var admin = await AdminClient();
        await using var product = await CreateProduct(admin);
        var unpaid = await CreateOrder(PaymentStatus.Unpaid, product.First);

        (await admin.GetAsync($"{ReviewsUrl}/order/{int.MaxValue}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var res = await admin.GetAsync($"{ReviewsUrl}/order/{unpaid}");
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).Should().Contain("pago aprobado");
    }
}
