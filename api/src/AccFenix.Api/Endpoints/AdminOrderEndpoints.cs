using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

// ---- Requests ----
public record OrderStatusRequest(OrderStatus? Status);

/// <summary>New address of a delivery order. Without coordinates the map point is removed.</summary>
public record OrderLocationRequest(string? Address, double? Latitude, double? Longitude) : IDeliveryLocation;

// ---- Responses ----
public record AdminOrderSummaryDto(
    int Id, int Number, DateTime CreatedAt, OrderStatus Status, CustomerType CustomerType,
    string CustomerName, string? Phone, Fulfillment Fulfillment, string TimeSlot, string? Address,
    PaymentStatus PaymentStatus, DateTime? PaidAt,
    decimal Total, bool HasUnpricedItems, int ItemCount, int TotalUnits);

public record AdminOrderPageDto(int Total, int Page, int PageSize, List<AdminOrderSummaryDto> Items);

public record AdminOrderDto(
    int Id, int Number, DateTime CreatedAt, OrderStatus Status, CustomerType CustomerType,
    string CustomerName, string? Phone, Fulfillment Fulfillment, string TimeSlot,
    string? Address, double? Latitude, double? Longitude, string? Comments,
    PaymentStatus PaymentStatus, string? MercadoPagoPaymentId, DateTime? PaidAt,
    decimal Total, bool HasUnpricedItems, List<OrderItemDto> Items);

public record AdminOrderStatusDto(int Id, int Number, OrderStatus Status);

// ---- Validators ----
public class OrderStatusRequestValidator : AbstractValidator<OrderStatusRequest>
{
    public OrderStatusRequestValidator()
    {
        RuleFor(x => x.Status).NotNull().IsInEnum();
    }
}

/// <summary>Same address rules as public order creation.</summary>
public class OrderLocationRequestValidator : AbstractValidator<OrderLocationRequest>
{
    public OrderLocationRequestValidator()
    {
        Include(DeliveryLocationValidator.Instance);
    }
}

public static class AdminOrderEndpoints
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    public static RouteGroupBuilder MapAdminOrderEndpoints(this RouteGroupBuilder admin)
    {
        // Newest first. "status" takes the same names the JSON uses (pending, outForDelivery...).
        // "paid=true" lists only orders whose payment was approved: the ones the owner has to prepare.
        admin.MapGet("/orders", async (int? page, int? pageSize, string? status, bool? paid, AppDbContext db, CancellationToken ct) =>
        {
            var pageNumber = page ?? 1;
            var size = pageSize ?? DefaultPageSize;
            var errors = new Dictionary<string, string[]>();
            if (pageNumber < 1) errors["page"] = ["Debe ser 1 o mayor"];
            if (size is < 1 or > MaxPageSize) errors["pageSize"] = [$"Debe estar entre 1 y {MaxPageSize}"];
            OrderStatus? filter = null;
            if (!string.IsNullOrEmpty(status))
            {
                // Names only: Enum.TryParse would also accept numbers.
                var name = Enum.GetNames<OrderStatus>().FirstOrDefault(n => n.Equals(status, StringComparison.OrdinalIgnoreCase));
                if (name is null) errors["status"] = ["Estado desconocido"];
                else filter = Enum.Parse<OrderStatus>(name);
            }
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var onlyPaid = paid == true;
            var query = db.Orders.AsNoTracking()
                .Where(o => filter == null || o.Status == filter)
                .Where(o => !onlyPaid || o.PaymentStatus == PaymentStatus.Approved);
            var total = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id)
                // long arithmetic: a huge page number must not overflow the offset.
                .Skip((int)Math.Min((long)(pageNumber - 1) * size, int.MaxValue)).Take(size)
                .Select(o => new AdminOrderSummaryDto(
                    o.Id, o.Number, o.CreatedAt, o.Status, o.CustomerType, o.CustomerName, o.Phone,
                    o.Fulfillment, o.TimeSlot, o.Address,
                    o.PaymentStatus, o.PaidAt,
                    o.Total, o.HasUnpricedItems, o.Items.Count, o.Items.Sum(i => i.Quantity)))
                .ToListAsync(ct);
            return Results.Ok(new AdminOrderPageDto(total, pageNumber, size, items));
        });

        admin.MapGet("/orders/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
        {
            var o = await db.Orders.AsNoTracking().Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct);
            return o is null ? Results.NotFound() : Results.Ok(ToDto(o));
        });

        // Only delivery orders have an address; pickup orders are a 409 (their state forbids it).
        admin.MapPatch("/orders/{id:int}/location", async (int id, OrderLocationRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var order = await db.Orders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct);
            if (order is null) return Results.NotFound();
            if (order.Fulfillment != Fulfillment.Delivery)
                return ValidationExtensions.Conflict("Solo se puede editar la dirección de pedidos con envío");

            order.Address = req.Address!.Trim();
            order.Latitude = req.Latitude;
            order.Longitude = req.Longitude;
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToDto(order));
        }).Validate<OrderLocationRequest>();

        // Any status may follow any other: the admin can also undo a mistaken change.
        admin.MapPatch("/orders/{id:int}/status", async (int id, OrderStatusRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var order = await db.Orders.FindAsync([id], ct);
            if (order is null) return Results.NotFound();
            order.Status = req.Status!.Value;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new AdminOrderStatusDto(order.Id, order.Number, order.Status));
        }).Validate<OrderStatusRequest>();

        return admin;
    }

    static AdminOrderDto ToDto(Order o) => new(
        o.Id, o.Number, o.CreatedAt, o.Status, o.CustomerType, o.CustomerName, o.Phone,
        o.Fulfillment, o.TimeSlot, o.Address, o.Latitude, o.Longitude, o.Comments,
        o.PaymentStatus, o.MercadoPagoPaymentId, o.PaidAt,
        o.Total, o.HasUnpricedItems,
        o.Items.OrderBy(i => i.Id).Select(OrderEndpoints.ToDto).ToList());
}
