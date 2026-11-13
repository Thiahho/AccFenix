using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace AccFenix.Api.Tests;

/// <summary>
/// CHECK constraints guard the order and price data even when a write bypasses the API validators.
/// Every write runs inside a transaction that is rolled back, so nothing leaks into other tests.
/// </summary>
[Collection(ApiCollection.Name)]
public class DatabaseConstraintTests(ApiFactory factory)
{
    const string CheckViolation = "23514";

    /// <summary>Runs <paramref name="write"/> in a rolled-back transaction and returns the Postgres error it raised, if any.</summary>
    async Task<PostgresException?> Attempt(Func<AppDbContext, Task> write)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            await write(db);
            return null;
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException pg)
        {
            return pg;
        }
        catch (PostgresException pg)
        {
            return pg;
        }
    }

    async Task ExpectViolation(string constraint, Func<AppDbContext, Task> write)
    {
        var error = await Attempt(write);
        error.Should().NotBeNull($"the database must reject the write through {constraint}");
        error!.SqlState.Should().Be(CheckViolation);
        error.ConstraintName.Should().Be(constraint);
    }

    async Task ExpectAccepted(Func<AppDbContext, Task> write) => (await Attempt(write)).Should().BeNull();

    static Order BuenosAiresOrder() => new()
    {
        CreatedAt = DateTime.UtcNow,
        CustomerName = "Test",
        Phone = "1100000000",
        Zone = DeliveryZone.BuenosAires,
        Locality = "CABA",
        Address = "Calle 123",
    };

    static Order OtherProvinceOrder() => new()
    {
        CreatedAt = DateTime.UtcNow,
        CustomerName = "Test",
        Phone = "1100000000",
        Zone = DeliveryZone.OtherProvince,
        Province = "Córdoba",
        Carrier = "Andreani",
    };

    static OrderItem Item(int quantity = 1, decimal? unitPrice = 10m, decimal? subtotal = 10m) => new()
    {
        ProductName = "Product",
        Sku = "SKU-1",
        VariantLabel = "Label",
        Quantity = quantity,
        UnitPrice = unitPrice,
        Subtotal = subtotal,
    };

    static Func<AppDbContext, Task> Save(Order order) => db =>
    {
        db.Orders.Add(order);
        return db.SaveChangesAsync();
    };

    static Func<AppDbContext, Task> SetVariantPrices(decimal? retail, decimal? wholesale) => async db =>
    {
        var variant = await db.Variants.OrderBy(v => v.Id).FirstAsync();
        variant.RetailPrice = retail;
        variant.WholesalePrice = wholesale;
        await db.SaveChangesAsync();
    };

    static Order With(Order order, Action<Order> change)
    {
        change(order);
        return order;
    }

    // ---- Variants ----

    [Theory]
    [InlineData(-0.01, null, "CK_Variants_RetailPrice")]
    [InlineData(100_000_000.0, null, "CK_Variants_RetailPrice")]
    [InlineData(null, -0.01, "CK_Variants_WholesalePrice")]
    [InlineData(null, 100_000_000.0, "CK_Variants_WholesalePrice")]
    public Task Variant_prices_out_of_range_are_rejected(double? retail, double? wholesale, string constraint) =>
        ExpectViolation(constraint, SetVariantPrices((decimal?)retail, (decimal?)wholesale));

    [Fact]
    public async Task Variant_prices_within_range_or_missing_are_accepted()
    {
        await ExpectAccepted(SetVariantPrices(0m, 99_999_999.99m));
        await ExpectAccepted(SetVariantPrices(null, null));
    }

    // ---- Orders ----

    [Fact]
    public async Task Valid_orders_of_both_zones_are_accepted()
    {
        await ExpectAccepted(Save(With(BuenosAiresOrder(), o => { o.Latitude = 90; o.Longitude = -180; o.Items = [Item(100_000, 0m, 0m)]; })));
        await ExpectAccepted(Save(With(OtherProvinceOrder(), o => o.Items = [Item(unitPrice: null, subtotal: null)])));
        await ExpectAccepted(Save(With(BuenosAiresOrder(), o => o.CustomerType = CustomerType.Business)));
        // The phone is optional: the customer writes from their own WhatsApp.
        await ExpectAccepted(Save(With(OtherProvinceOrder(), o => o.Phone = null)));
    }

    public static TheoryData<string, Func<Order>> InvalidOrders => new()
    {
        { "CK_Orders_CustomerType", () => With(BuenosAiresOrder(), o => o.CustomerType = (CustomerType)2) },
        { "CK_Orders_CustomerType", () => With(BuenosAiresOrder(), o => o.CustomerType = (CustomerType)(-1)) },
        { "CK_Orders_Status", () => With(BuenosAiresOrder(), o => o.Status = (OrderStatus)5) },
        { "CK_Orders_Status", () => With(BuenosAiresOrder(), o => o.Status = (OrderStatus)(-1)) },
        { "CK_Orders_Zone", () => With(BuenosAiresOrder(), o => o.Zone = (DeliveryZone)2) },
        { "CK_Orders_Total", () => With(BuenosAiresOrder(), o => o.Total = -0.01m) },
        { "CK_Orders_Coordinates", () => With(BuenosAiresOrder(), o => o.Latitude = 10) },
        { "CK_Orders_Coordinates", () => With(BuenosAiresOrder(), o => o.Longitude = 10) },
        { "CK_Orders_Latitude", () => With(BuenosAiresOrder(), o => { o.Latitude = 90.5; o.Longitude = 0; }) },
        { "CK_Orders_Latitude", () => With(BuenosAiresOrder(), o => { o.Latitude = -90.5; o.Longitude = 0; }) },
        { "CK_Orders_Longitude", () => With(BuenosAiresOrder(), o => { o.Latitude = 0; o.Longitude = 180.5; }) },
        { "CK_Orders_Longitude", () => With(BuenosAiresOrder(), o => { o.Latitude = 0; o.Longitude = -180.5; }) },
        { "CK_Orders_ZoneFields", () => With(BuenosAiresOrder(), o => o.Locality = null) },
        { "CK_Orders_ZoneFields", () => With(BuenosAiresOrder(), o => o.Address = null) },
        { "CK_Orders_ZoneFields", () => With(BuenosAiresOrder(), o => o.Province = "Córdoba") },
        { "CK_Orders_ZoneFields", () => With(BuenosAiresOrder(), o => o.Carrier = "Andreani") },
        { "CK_Orders_ZoneFields", () => With(OtherProvinceOrder(), o => o.Province = null) },
        { "CK_Orders_ZoneFields", () => With(OtherProvinceOrder(), o => o.Carrier = null) },
        { "CK_Orders_ZoneFields", () => With(OtherProvinceOrder(), o => o.Locality = "CABA") },
        { "CK_Orders_ZoneFields", () => With(OtherProvinceOrder(), o => o.Address = "Calle 123") },
        { "CK_Orders_ZoneFields", () => With(OtherProvinceOrder(), o => { o.Latitude = 0; o.Longitude = 0; }) },
    };

    [Theory]
    [MemberData(nameof(InvalidOrders))]
    public Task Invalid_orders_are_rejected(string constraint, Func<Order> order) => ExpectViolation(constraint, Save(order()));

    [Fact]
    public Task Order_number_must_be_positive() => ExpectViolation("CK_Orders_Number", db => db.Database.ExecuteSqlRawAsync("""
        INSERT INTO "Orders" ("Number", "CreatedAt", "Status", "CustomerName", "Phone", "Zone", "Locality", "Address", "IsWholesale", "Total", "HasUnpricedItems")
        OVERRIDING SYSTEM VALUE
        VALUES (0, now(), 0, 'Test', '1100000000', 0, 'CABA', 'Calle 123', false, 0, false)
        """));

    // ---- Order items ----

    [Theory]
    [InlineData(0, 10.0, 10.0, "CK_OrderItems_Quantity")]
    [InlineData(-1, 10.0, 10.0, "CK_OrderItems_Quantity")]
    [InlineData(100_001, 10.0, 10.0, "CK_OrderItems_Quantity")]
    [InlineData(1, -0.01, null, "CK_OrderItems_UnitPrice")]
    [InlineData(1, null, -0.01, "CK_OrderItems_Subtotal")]
    public Task Invalid_order_items_are_rejected(int quantity, double? unitPrice, double? subtotal, string constraint) =>
        ExpectViolation(constraint, Save(With(BuenosAiresOrder(), o => o.Items = [Item(quantity, (decimal?)unitPrice, (decimal?)subtotal)])));
}
