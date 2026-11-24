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

    static Order DeliveryOrder() => new()
    {
        CreatedAt = DateTime.UtcNow,
        CustomerName = "Test",
        Fulfillment = Fulfillment.Delivery,
        TimeSlot = "Hoy 18 a 18:30",
        Address = "Calle 123",
    };

    static Order PickupOrder() => new()
    {
        CreatedAt = DateTime.UtcNow,
        CustomerName = "Test",
        Fulfillment = Fulfillment.Pickup,
        TimeSlot = "Hoy 18 a 18:30",
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

    static Func<AppDbContext, Task> SetVariantPrice(decimal? retail) => async db =>
    {
        var variant = await db.Variants.OrderBy(v => v.Id).FirstAsync();
        variant.RetailPrice = retail;
        await db.SaveChangesAsync();
    };

    static Order With(Order order, Action<Order> change)
    {
        change(order);
        return order;
    }

    // ---- Variants ----

    [Theory]
    [InlineData(-1.0, "CK_Variants_RetailPrice")]
    [InlineData(100_000_000.0, "CK_Variants_RetailPrice")]
    public Task Variant_prices_out_of_range_are_rejected(double retail, string constraint) =>
        ExpectViolation(constraint, SetVariantPrice((decimal)retail));

    [Fact]
    public async Task Variant_prices_within_range_or_missing_are_accepted()
    {
        await ExpectAccepted(SetVariantPrice(0m));
        await ExpectAccepted(SetVariantPrice(99_999_999m));
        await ExpectAccepted(SetVariantPrice(null));
    }

    // ---- Orders ----

    [Fact]
    public async Task Valid_orders_of_both_fulfillments_are_accepted()
    {
        await ExpectAccepted(Save(With(DeliveryOrder(), o => { o.Latitude = 90; o.Longitude = -180; o.Items = [Item(100_000, 0m, 0m)]; })));
        await ExpectAccepted(Save(With(PickupOrder(), o => o.Items = [Item(unitPrice: null, subtotal: null)])));
        await ExpectAccepted(Save(With(DeliveryOrder(), o => o.CustomerType = CustomerType.Business)));
        // The phone is optional: the customer writes from their own WhatsApp.
        await ExpectAccepted(Save(With(PickupOrder(), o => o.Phone = null)));
        // An approved payment needs its date, and the date comes with it.
        await ExpectAccepted(Save(With(PickupOrder(), o => { o.PaymentStatus = PaymentStatus.Approved; o.PaidAt = DateTime.UtcNow; })));
    }

    public static TheoryData<string, Func<Order>> InvalidOrders => new()
    {
        { "CK_Orders_CustomerType", () => With(DeliveryOrder(), o => o.CustomerType = (CustomerType)2) },
        { "CK_Orders_CustomerType", () => With(DeliveryOrder(), o => o.CustomerType = (CustomerType)(-1)) },
        { "CK_Orders_Status", () => With(DeliveryOrder(), o => o.Status = (OrderStatus)5) },
        { "CK_Orders_Status", () => With(DeliveryOrder(), o => o.Status = (OrderStatus)(-1)) },
        { "CK_Orders_Fulfillment", () => With(DeliveryOrder(), o => o.Fulfillment = (Fulfillment)2) },
        { "CK_Orders_PaymentStatus", () => With(PickupOrder(), o => o.PaymentStatus = (PaymentStatus)99) },
        { "CK_Orders_PaidAt", () => With(PickupOrder(), o => o.PaymentStatus = PaymentStatus.Approved) },
        { "CK_Orders_PaidAt", () => With(PickupOrder(), o => o.PaidAt = DateTime.UtcNow) },
        { "CK_Orders_Total", () => With(DeliveryOrder(), o => o.Total = -1m) },
        { "CK_Orders_Coordinates", () => With(DeliveryOrder(), o => o.Latitude = 10) },
        { "CK_Orders_Coordinates", () => With(DeliveryOrder(), o => o.Longitude = 10) },
        { "CK_Orders_Latitude", () => With(DeliveryOrder(), o => { o.Latitude = 90.5; o.Longitude = 0; }) },
        { "CK_Orders_Latitude", () => With(DeliveryOrder(), o => { o.Latitude = -90.5; o.Longitude = 0; }) },
        { "CK_Orders_Longitude", () => With(DeliveryOrder(), o => { o.Latitude = 0; o.Longitude = 180.5; }) },
        { "CK_Orders_Longitude", () => With(DeliveryOrder(), o => { o.Latitude = 0; o.Longitude = -180.5; }) },
        { "CK_Orders_FulfillmentAddress", () => With(DeliveryOrder(), o => o.Address = null) },
        { "CK_Orders_FulfillmentAddress", () => With(PickupOrder(), o => o.Address = "Calle 123") },
        { "CK_Orders_FulfillmentAddress", () => With(PickupOrder(), o => { o.Latitude = 0; o.Longitude = 0; }) },
    };

    [Theory]
    [MemberData(nameof(InvalidOrders))]
    public Task Invalid_orders_are_rejected(string constraint, Func<Order> order) => ExpectViolation(constraint, Save(order()));

    [Fact]
    public Task Order_number_must_be_positive() => ExpectViolation("CK_Orders_Number", db => db.Database.ExecuteSqlRawAsync("""
        INSERT INTO "Orders" ("Number", "CreatedAt", "Status", "CustomerType", "CustomerName", "Fulfillment", "TimeSlot", "Total", "HasUnpricedItems", "PaymentStatus")
        OVERRIDING SYSTEM VALUE
        VALUES (0, now(), 0, 0, 'Test', 1, 'Hoy 18 a 18:30', 0, false, 0)
        """));

    // ---- Order items ----

    [Theory]
    [InlineData(0, 10.0, 10.0, "CK_OrderItems_Quantity")]
    [InlineData(-1, 10.0, 10.0, "CK_OrderItems_Quantity")]
    [InlineData(100_001, 10.0, 10.0, "CK_OrderItems_Quantity")]
    [InlineData(1, -1.0, null, "CK_OrderItems_UnitPrice")]
    [InlineData(1, null, -1.0, "CK_OrderItems_Subtotal")]
    public Task Invalid_order_items_are_rejected(int quantity, double? unitPrice, double? subtotal, string constraint) =>
        ExpectViolation(constraint, Save(With(DeliveryOrder(), o => o.Items = [Item(quantity, (decimal?)unitPrice, (decimal?)subtotal)])));
}
