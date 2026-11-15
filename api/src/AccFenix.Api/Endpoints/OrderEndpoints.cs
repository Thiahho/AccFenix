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
/// Buenos Aires orders send locality, address and optionally both coordinates; orders to another
/// province send province and carrier. Fields of the other zone must be absent.
/// The phone is optional (the customer sends the order from their own WhatsApp); a blank phone is stored as null.
/// </summary>
public record CreateOrderRequest(
    DeliveryZone? Zone, CustomerType? CustomerType, string? CustomerName, string? Phone,
    string? Locality, string? Address, double? Latitude, double? Longitude,
    string? Province, string? Carrier,
    string? Comments, List<OrderLineRequest>? Items) : IBuenosAiresLocation;

/// <summary>Delivery location of an own-delivery (Buenos Aires) order: locality, address and an optional map point.</summary>
public interface IBuenosAiresLocation
{
    string? Locality { get; }
    string? Address { get; }
    double? Latitude { get; }
    double? Longitude { get; }
}

// ---- Responses ----
public record OrderItemDto(int Id, int? VariantId, string ProductName, string Sku, string VariantLabel, int Quantity, decimal? UnitPrice, decimal? Subtotal);

/// <summary>Confirmation of a new order. It deliberately leaves out the customer's personal data.</summary>
public record OrderCreatedDto(int Id, int Number, OrderStatus Status, DateTime CreatedAt, bool IsWholesale, decimal Total, bool HasUnpricedItems, List<OrderItemDto> Items);

// ---- Validators ----
public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    const string WrongZone = "No corresponde a la zona de entrega elegida";

    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.Zone).NotNull().IsInEnum();
        RuleFor(x => x.CustomerType).NotNull().IsInEnum();
        RequiredText(x => x.CustomerName!, OrderLimits.Name);
        When(x => !string.IsNullOrWhiteSpace(x.Phone), () => RequiredText(x => x.Phone!, OrderLimits.Phone));
        RuleFor(x => x.Comments)
            .Must(s => s is null || (s.Trim().Length <= OrderLimits.Comments && !s.Contains('\0')))
            .WithMessage($"Hasta {OrderLimits.Comments} caracteres, sin caracteres no válidos");

        When(x => x.Zone == DeliveryZone.BuenosAires, () =>
        {
            Include(BuenosAiresLocationValidator.Instance);
            RuleFor(x => x.Province).Null().WithMessage(WrongZone);
            RuleFor(x => x.Carrier).Null().WithMessage(WrongZone);
        });

        When(x => x.Zone == DeliveryZone.OtherProvince, () =>
        {
            RuleFor(x => x.Province).Must(p => p is not null && Provinces.All.Contains(p.Trim())).WithMessage("Elegí la provincia");
            RequiredText(x => x.Carrier!, OrderLimits.Carrier);
            RuleFor(x => x.Locality).Null().WithMessage(WrongZone);
            RuleFor(x => x.Address).Null().WithMessage(WrongZone);
            RuleFor(x => x.Latitude).Null().WithMessage(WrongZone);
            RuleFor(x => x.Longitude).Null().WithMessage(WrongZone);
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
/// Rules of a Buenos Aires delivery location, shared by public order creation and the admin location edit.
/// Internal so assembly scanning does not register it as a validator of its own.
/// </summary>
internal sealed class BuenosAiresLocationValidator : AbstractValidator<IBuenosAiresLocation>
{
    public static readonly BuenosAiresLocationValidator Instance = new();

    BuenosAiresLocationValidator()
    {
        RuleFor(x => x.Locality!).RequiredText(OrderLimits.Locality);
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
        app.MapPost("/api/orders", async (CreateOrderRequest req, AppDbContext db, ILoggerFactory loggers, CancellationToken ct) =>
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
                    v.WholesalePrice,
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

            var thresholdSetting = await db.Settings.Where(s => s.Key == SettingKeys.WholesaleThreshold).Select(s => s.Value).FirstOrDefaultAsync(ct);
            var threshold = WholesaleThreshold.Parse(thresholdSetting);
            var pricedUnits = lines
                .Where(l => OrderPricing.CountsTowardWholesale(variants[l.VariantId].RetailPrice, variants[l.VariantId].WholesalePrice))
                .Sum(l => l.Quantity);
            var isWholesale = OrderPricing.IsWholesale(pricedUnits, threshold);

            var items = lines.Select(line =>
            {
                var variant = variants[line.VariantId];
                var unitPrice = OrderPricing.UnitPrice(variant.RetailPrice, variant.WholesalePrice, isWholesale);
                // Same wording the site shows in the cart: "Medida 34 · Color Cedro".
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

            var buenosAires = req.Zone == DeliveryZone.BuenosAires;
            var order = new Order
            {
                CreatedAt = DateTime.UtcNow,
                Status = OrderStatus.Pending,
                CustomerType = req.CustomerType!.Value,
                CustomerName = req.CustomerName!.Trim(),
                Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                Zone = req.Zone!.Value,
                Locality = buenosAires ? req.Locality!.Trim() : null,
                Address = buenosAires ? req.Address!.Trim() : null,
                Latitude = buenosAires ? req.Latitude : null,
                Longitude = buenosAires ? req.Longitude : null,
                Province = buenosAires ? null : req.Province!.Trim(),
                Carrier = buenosAires ? null : req.Carrier!.Trim(),
                Comments = string.IsNullOrWhiteSpace(req.Comments) ? null : req.Comments.Trim(),
                IsWholesale = isWholesale,
                Total = total,
                HasUnpricedItems = items.Any(i => i.UnitPrice is null),
                Items = items,
            };
            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);
            // No personal data in the log: only what identifies the order and its amount.
            loggers.CreateLogger(LogCategory).LogInformation(
                "Order created: id {OrderId}, number {OrderNumber}, total {OrderTotal}, wholesale {IsWholesale}",
                order.Id, order.Number, order.Total, order.IsWholesale);

            return Results.Created((string?)null, new OrderCreatedDto(
                order.Id, order.Number, order.Status, order.CreatedAt, order.IsWholesale, order.Total, order.HasUnpricedItems,
                order.Items.Select(ToDto).ToList()));
        })
        .Validate<CreateOrderRequest>()
        .RequireRateLimiting(CreateRateLimit)
        .WithTags("Public");
    }

    public static OrderItemDto ToDto(OrderItem i) => new(i.Id, i.VariantId, i.ProductName, i.Sku, i.VariantLabel, i.Quantity, i.UnitPrice, i.Subtotal);

    static IResult ItemsProblem(string message) => Results.ValidationProblem(new Dictionary<string, string[]> { ["items"] = [message] });
}
