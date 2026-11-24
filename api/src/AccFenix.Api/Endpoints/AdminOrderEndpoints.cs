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
    decimal Total, bool HasUnpricedItems, List<OrderItemDto> Items, string ReviewToken);

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
    const int MaxSearchLength = 100;
    static readonly HashSet<string> SortKeys = ["date", "customer", "units", "total", "status"];

    /// <summary>Names only: Enum.TryParse would also accept numbers.</summary>
    static T? ParseEnumName<T>(string? value, string key, string error, Dictionary<string, string[]> errors) where T : struct, Enum
    {
        if (string.IsNullOrEmpty(value)) return null;
        var name = Enum.GetNames<T>().FirstOrDefault(n => n.Equals(value, StringComparison.OrdinalIgnoreCase));
        if (name is null)
        {
            errors[key] = [error];
            return null;
        }
        return Enum.Parse<T>(name);
    }

    /// <summary>The id breaks ties, so a row never repeats or disappears between pages.</summary>
    static IOrderedQueryable<Order> ApplySort(IQueryable<Order> query, string sort, bool descending) => sort switch
    {
        "customer" => descending ? query.OrderByDescending(o => o.CustomerName).ThenByDescending(o => o.Id) : query.OrderBy(o => o.CustomerName).ThenBy(o => o.Id),
        "units" => descending ? query.OrderByDescending(o => o.Items.Sum(i => i.Quantity)).ThenByDescending(o => o.Id) : query.OrderBy(o => o.Items.Sum(i => i.Quantity)).ThenBy(o => o.Id),
        "total" => descending ? query.OrderByDescending(o => o.Total).ThenByDescending(o => o.Id) : query.OrderBy(o => o.Total).ThenBy(o => o.Id),
        "status" => descending ? query.OrderByDescending(o => o.Status).ThenByDescending(o => o.Id) : query.OrderBy(o => o.Status).ThenBy(o => o.Id),
        _ => descending ? query.OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id) : query.OrderBy(o => o.CreatedAt).ThenBy(o => o.Id),
    };

    public static RouteGroupBuilder MapAdminOrderEndpoints(this RouteGroupBuilder admin)
    {
        // Newest first. "status" takes the same names the JSON uses (pending, outForDelivery...).
        // "paid=true" lists only orders whose payment was approved: the ones the owner has to prepare.
        // "q" searches the customer name or the exact order number. "sort" is date, customer, units, total or status.
        admin.MapGet("/orders", async (int? page, int? pageSize, string? status, bool? paid, string? q, string? payment, string? fulfillment, string? sort, string? dir, AppDbContext db, CancellationToken ct) =>
        {
            var pageNumber = page ?? 1;
            var size = pageSize ?? DefaultPageSize;
            var errors = new Dictionary<string, string[]>();
            if (pageNumber < 1) errors["page"] = ["Debe ser 1 o mayor"];
            if (size is < 1 or > MaxPageSize) errors["pageSize"] = [$"Debe estar entre 1 y {MaxPageSize}"];
            var filter = ParseEnumName<OrderStatus>(status, "status", "Estado desconocido", errors);
            var paymentFilter = ParseEnumName<PaymentStatus>(payment, "payment", "Estado de pago desconocido", errors);
            var fulfillmentFilter = ParseEnumName<Fulfillment>(fulfillment, "fulfillment", "Tipo de entrega desconocido", errors);
            var search = q?.Trim() ?? "";
            if (search.Length > MaxSearchLength) errors["q"] = [$"Debe tener hasta {MaxSearchLength} caracteres"];
            var sortKey = string.IsNullOrEmpty(sort) ? "date" : sort.ToLowerInvariant();
            if (!SortKeys.Contains(sortKey)) errors["sort"] = ["Orden desconocido"];
            var direction = string.IsNullOrEmpty(dir) ? "desc" : dir.ToLowerInvariant();
            if (direction is not ("asc" or "desc")) errors["dir"] = ["Debe ser asc o desc"];
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var onlyPaid = paid == true;
            var query = db.Orders.AsNoTracking()
                .Where(o => filter == null || o.Status == filter)
                .Where(o => paymentFilter == null || o.PaymentStatus == paymentFilter)
                .Where(o => fulfillmentFilter == null || o.Fulfillment == fulfillmentFilter)
                .Where(o => !onlyPaid || o.PaymentStatus == PaymentStatus.Approved || o.PaymentStatus == PaymentStatus.Refunded);
            if (search.Length > 0)
            {
                var term = search.ToLower();
                int? number = int.TryParse(search.TrimStart('#'), out var parsed) ? parsed : null;
                query = query.Where(o => o.CustomerName.ToLower().Contains(term) || (number != null && o.Number == number));
            }
            var total = await query.CountAsync(ct);
            var items = await ApplySort(query, sortKey, direction == "desc")
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
        o.Items.OrderBy(i => i.Id).Select(OrderEndpoints.ToDto).ToList(), o.ReviewToken);
}
