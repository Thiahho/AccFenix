namespace AccFenix.Api.Domain;

public enum OrderStatus
{
    Pending = 0,
    Confirmed = 1,
    OutForDelivery = 2,
    Delivered = 3,
    Cancelled = 4,
}

/// <summary>How the customer gets the order: delivered in Moreno, or picked up at the shop.</summary>
public enum Fulfillment
{
    /// <summary>Delivery in Moreno: needs an address; the map point is optional.</summary>
    Delivery = 0,
    /// <summary>Pickup at the shop: needs a time slot and no address.</summary>
    Pickup = 1,
}

/// <summary>Payment state, kept apart from the order status. Only an approved payment reaches the owner as paid.</summary>
public enum PaymentStatus
{
    Unpaid = 0,
    Approved = 1,
    Rejected = 2,
    /// <summary>It was paid and the money went back (refund or chargeback). PaidAt keeps the original date.</summary>
    Refunded = 3,
}

/// <summary>Who places the order: a person ("Personal") or a business ("Comercio").</summary>
public enum CustomerType
{
    Personal = 0,
    Business = 1,
}

/// <summary>
/// A customer order as it was placed. Prices and product data are copied into the order,
/// so later catalog changes never alter it.
/// </summary>
public class Order
{
    public int Id { get; set; }
    /// <summary>Human-friendly sequential number, assigned by the database. Also the Mercado Pago external reference.</summary>
    public int Number { get; set; }
    public DateTime CreatedAt { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public CustomerType CustomerType { get; set; } = CustomerType.Personal;
    public required string CustomerName { get; set; }
    /// <summary>Optional: the customer may leave a phone number.</summary>
    public string? Phone { get; set; }

    public Fulfillment Fulfillment { get; set; }
    /// <summary>Time slot the customer picked, for delivery or pickup. Free text, e.g. "Hoy 18:00 a 18:30".</summary>
    public required string TimeSlot { get; set; }

    // Delivery only.
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public string? Comments { get; set; }

    /// <summary>Sum of the priced lines, in ARS.</summary>
    public decimal Total { get; set; }
    /// <summary>True when at least one line had no price, so the order cannot be paid online.</summary>
    public bool HasUnpricedItems { get; set; }

    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public string? MercadoPagoPreferenceId { get; set; }
    public string? MercadoPagoPaymentId { get; set; }
    public DateTime? PaidAt { get; set; }

    /// <summary>Secret of the order's review link. Never returned by a public endpoint.</summary>
    public string ReviewToken { get; set; } = NewReviewToken();

    public List<OrderItem> Items { get; set; } = [];

    public const int ReviewTokenLength = 32;

    public static string NewReviewToken() =>
        Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(ReviewTokenLength / 2)).ToLowerInvariant();
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    /// <summary>Null once the variant has been removed from the catalog; the snapshot below remains.</summary>
    public int? VariantId { get; set; }
    public Variant? Variant { get; set; }

    public required string ProductName { get; set; }
    public required string Sku { get; set; }
    /// <summary>Readable description of the variant, e.g. "Tamaño Grande (700 cc) · Extra leche de almendras".</summary>
    public required string VariantLabel { get; set; }

    public int Quantity { get; set; }
    /// <summary>Unit price applied to the line; null when the variant had no price.</summary>
    public decimal? UnitPrice { get; set; }
    public decimal? Subtotal { get; set; }
}

/// <summary>Size limits of an order. The text limits match the order form of the site.</summary>
public static class OrderLimits
{
    public const int Name = 120;
    /// <summary>Size of the phone column. New orders are held to the narrower <see cref="PhoneMaxLength"/>.</summary>
    public const int Phone = 40;
    /// <summary>Length of a phone sent with an order, once trimmed. The order form uses the same rule.</summary>
    public const int PhoneMinLength = 8;
    public const int PhoneMaxLength = 20;
    /// <summary>Digits a phone needs at least, so punctuation alone cannot make it valid.</summary>
    public const int PhoneMinDigits = 8;
    public const int Address = 200;
    public const int TimeSlot = 60;
    public const int Comments = 500;
    public const int VariantLabel = 1000;
    public const int MercadoPagoId = 100;

    public const int MaxLines = 100;
    public const int MaxQuantity = 100_000;
    public const int MaxAddons = 20;
    /// <summary>Largest amount, in whole pesos, accepted for an order; it fits the numeric(12,0) money columns.</summary>
    public const decimal MaxAmount = 9_999_999_999m;
}
