using System.Linq.Expressions;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

// ---- Requests ----
public record OrderLineRequest(int VariantId, int Quantity);

/// <summary>
/// An order as sent by the site. It carries no prices: the server prices every line itself.
/// Delivery orders send an address and optionally a map point. Pickup orders send no address.
/// Both send the time slot. The phone is optional; a blank phone is stored as null.
/// </summary>
public record CreateOrderRequest(
    Fulfillment? Fulfillment, CustomerType? CustomerType, string? CustomerName, string? Phone,
    string? TimeSlot, string? Address, double? Latitude, double? Longitude,
    string? Comments, List<OrderLineRequest>? Items) : IDeliveryLocation;

/// <summary>Delivery location of a delivery order: an address and an optional map point.</summary>
public interface IDeliveryLocation
{
    string? Address { get; }
    double? Latitude { get; }
    double? Longitude { get; }
}

// ---- Responses ----
public record OrderItemDto(int Id, int? VariantId, string ProductName, string Sku, string VariantLabel, int Quantity, decimal? UnitPrice, decimal? Subtotal);

/// <summary>
/// Confirmation of a new order. It leaves out the customer's personal data. CheckoutUrl is where the customer pays;
/// it is null when the order cannot be paid online (an unpriced line, or Mercado Pago not configured).
/// </summary>
public record OrderCreatedDto(
    int Id, int Number, OrderStatus Status, PaymentStatus PaymentStatus, DateTime CreatedAt,
    decimal Total, bool HasUnpricedItems, List<OrderItemDto> Items, string? CheckoutUrl);

// ---- Validators ----
public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    const string WrongFulfillment = "No corresponde a la forma de entrega elegida";

    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.Fulfillment).NotNull().IsInEnum();
        RuleFor(x => x.CustomerType).NotNull().IsInEnum();
        RequiredText(x => x.CustomerName!, OrderLimits.Name);
        When(x => !string.IsNullOrWhiteSpace(x.Phone), () => RequiredText(x => x.Phone!, OrderLimits.Phone));
        RequiredText(x => x.TimeSlot!, OrderLimits.TimeSlot);
        RuleFor(x => x.Comments)
            .Must(s => s is null || (s.Trim().Length <= OrderLimits.Comments && !s.Contains('\0')))
            .WithMessage($"Hasta {OrderLimits.Comments} caracteres, sin caracteres no válidos");

        When(x => x.Fulfillment == Fulfillment.Delivery, () => Include(DeliveryLocationValidator.Instance));

        When(x => x.Fulfillment == Fulfillment.Pickup, () =>
        {
            RuleFor(x => x.Address).Null().WithMessage(WrongFulfillment);
            RuleFor(x => x.Latitude).Null().WithMessage(WrongFulfillment);
            RuleFor(x => x.Longitude).Null().WithMessage(WrongFulfillment);
        });

        RuleFor(x => x.Items).Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(items => items!.Count <= OrderLimits.MaxLines).WithMessage($"Hasta {OrderLimits.MaxLines} productos por pedido")
            .Must(items => items!.All(i => i is not null)).WithMessage("Hay elementos vacíos")
            .Must(items => items!.Select(i => i.VariantId).Distinct().Count() == items!.Count)
            .WithMessage("Cada variante puede aparecer una sola vez");
        RuleForEach(x => x.Items).Where(i => i is not null).ChildRules(item =>
        {
            item.RuleFor(i => i.VariantId).GreaterThan(0);
            item.RuleFor(i => i.Quantity).InclusiveBetween(1, OrderLimits.MaxQuantity);
        });
    }

    void RequiredText(Expression<Func<CreateOrderRequest, string>> field, int max) => RuleFor(field).RequiredText(max);
}

/// <summary>
/// Rules of a delivery location, shared by public order creation and the admin location edit.
/// Internal so assembly scanning does not register it as a validator of its own.
/// </summary>
internal sealed class DeliveryLocationValidator : AbstractValidator<IDeliveryLocation>
{
    public static readonly DeliveryLocationValidator Instance = new();

    DeliveryLocationValidator()
    {
        RuleFor(x => x.Address!).RequiredText(OrderLimits.Address);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.Longitude).Must((req, longitude) => (longitude is null) == (req.Latitude is null))
            .WithMessage("La ubicación necesita latitud y longitud");
    }
}

internal static class OrderTextRules
{
    /// <summary>Required single-line text. Like the form of the site, the length is measured once trimmed.</summary>
    public static IRuleBuilderOptions<T, string> RequiredText<T>(this IRuleBuilderInitial<T, string> rule, int max) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(s => s.Trim().Length <= max).WithMessage($"Hasta {max} caracteres")
            .SingleLine();
}

public static class OrderEndpoints
{
    public const string CreateRateLimit = "order-create";
    /// <summary>Orders a single visitor may submit per <see cref="CreateWindow"/>, rejected attempts included.</summary>
    public const int CreatePermitLimit = 10;
    public static readonly TimeSpan CreateWindow = TimeSpan.FromMinutes(10);
    const string LogCategory = "AccFenix.Api.Orders";

    public static void MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        // The only public order endpoint. Orders hold personal data, so there is no public way to read them back.
        app.MapPost("/api/orders", async (CreateOrderRequest req, AppDbContext db, ILoggerFactory loggers, MercadoPagoClient mercadoPago, CancellationToken ct) =>
        {
            var lines = req.Items!;
            var ids = lines.Select(l => l.VariantId).ToList();

            // Same visibility rule as the public catalog: variant, product and category must be active.
            var variants = await db.Variants.AsNoTracking()
                .Where(v => ids.Contains(v.Id) && v.IsActive && v.Product.IsActive && v.Product.Category.IsActive)
                .Select(v => new
                {
                    v.Id,
                    v.Sku,
                    v.RetailPrice,
                    ProductName = v.Product.Name,
                    Values = v.Values.Select(x => new
                    {
                        AttributeName = x.AttributeValue.Attribute.Name,
                        x.AttributeValue.Label,
                        SortOrder = v.Product.Category.Attributes
                            .Where(ca => ca.AttributeId == x.AttributeValue.AttributeId)
                            .Select(ca => (int?)ca.SortOrder).FirstOrDefault(),
                    }).ToList(),
                })
                .ToDictionaryAsync(v => v.Id, ct);
            if (variants.Count != ids.Count) return ItemsProblem("Hay productos que ya no están disponibles");

            var items = lines.Select(line =>
            {
                var variant = variants[line.VariantId];
                var unitPrice = OrderPricing.UnitPrice(variant.RetailPrice);
                // Same wording the site shows in the cart: "Tamaño Grande (700 cc)".
                var label = string.Join(" · ", variant.Values.OrderBy(x => x.SortOrder ?? int.MaxValue).ThenBy(x => x.AttributeName).Select(x => $"{x.AttributeName} {x.Label}"));
                return new OrderItem
                {
                    VariantId = variant.Id,
                    ProductName = variant.ProductName,
                    Sku = variant.Sku,
                    VariantLabel = label.Length <= OrderLimits.VariantLabel ? label : label[..OrderLimits.VariantLabel],
                    Quantity = line.Quantity,
                    UnitPrice = unitPrice,
                    Subtotal = unitPrice * line.Quantity,
                };
            }).ToList();

            var total = items.Sum(i => i.Subtotal ?? 0);
            if (total > OrderLimits.MaxAmount) return ItemsProblem("El total del pedido supera el máximo admitido");

            var delivery = req.Fulfillment == Fulfillment.Delivery;
            var order = new Order
            {
                CreatedAt = DateTime.UtcNow,
                Status = OrderStatus.Pending,
                PaymentStatus = PaymentStatus.Unpaid,
                CustomerType = req.CustomerType!.Value,
                CustomerName = req.CustomerName!.Trim(),
                Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                Fulfillment = req.Fulfillment!.Value,
                TimeSlot = req.TimeSlot!.Trim(),
                Address = delivery ? req.Address!.Trim() : null,
                Latitude = delivery ? req.Latitude : null,
                Longitude = delivery ? req.Longitude : null,
                Comments = string.IsNullOrWhiteSpace(req.Comments) ? null : req.Comments.Trim(),
                Total = total,
                HasUnpricedItems = items.Any(i => i.UnitPrice is null),
                Items = items,
            };
            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);

            // The order exists before paying; a pending payment leaves it unpaid and invisible to the owner.
            string? checkoutUrl = null;
            if (!order.HasUnpricedItems && mercadoPago.IsConfigured)
            {
                var preference = await mercadoPago.CreatePreferenceAsync(order, ct);
                order.MercadoPagoPreferenceId = preference.Id;
                await db.SaveChangesAsync(ct);
                checkoutUrl = preference.InitPoint;
            }

            // No personal data in the log: only what identifies the order and its amount.
            loggers.CreateLogger(LogCategory).LogInformation(
                "Order created: id {OrderId}, number {OrderNumber}, total {OrderTotal}, checkout {HasCheckout}",
                order.Id, order.Number, order.Total, checkoutUrl is not null);

            return Results.Created((string?)null, new OrderCreatedDto(
                order.Id, order.Number, order.Status, order.PaymentStatus, order.CreatedAt, order.Total, order.HasUnpricedItems,
                order.Items.Select(ToDto).ToList(), checkoutUrl));
        })
        .Validate<CreateOrderRequest>()
        .RequireRateLimiting(CreateRateLimit)
        .WithTags("Public");
    }

    public static OrderItemDto ToDto(OrderItem i) => new(i.Id, i.VariantId, i.ProductName, i.Sku, i.VariantLabel, i.Quantity, i.UnitPrice, i.Subtotal);

    static IResult ItemsProblem(string message) => Results.ValidationProblem(new Dictionary<string, string[]> { ["items"] = [message] });
}
