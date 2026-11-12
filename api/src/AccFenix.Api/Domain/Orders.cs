namespace AccFenix.Api.Domain;

public enum OrderStatus
{
    Pending = 0,
    Confirmed = 1,
    OutForDelivery = 2,
    Delivered = 3,
    Cancelled = 4,
}

/// <summary>Where the order is delivered; each zone asks the customer for different data.</summary>
public enum DeliveryZone
{
    /// <summary>Own delivery: locality, address and an optional map point.</summary>
    BuenosAires = 0,
    /// <summary>Shipped through a carrier: province and carrier.</summary>
    OtherProvince = 1,
}

/// <summary>
/// A customer order as it was placed. Prices and product data are copied into the order,
/// so later catalog changes never alter it.
/// </summary>
public class Order
{
    public int Id { get; set; }
    /// <summary>Human-friendly sequential number, assigned by the database.</summary>
    public int Number { get; set; }
    public DateTime CreatedAt { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public required string CustomerName { get; set; }
    public required string Phone { get; set; }
    public DeliveryZone Zone { get; set; }

    // Buenos Aires only.
    public string? Locality { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // Other province only.
    public string? Province { get; set; }
    public string? Carrier { get; set; }

    public string? Comments { get; set; }

    /// <summary>Whether the order reached the wholesale threshold in force when it was placed.</summary>
    public bool IsWholesale { get; set; }
    /// <summary>Sum of the priced lines, in ARS.</summary>
    public decimal Total { get; set; }
    /// <summary>True when at least one line had no price, so the total does not cover the whole order.</summary>
    public bool HasUnpricedItems { get; set; }

    public List<OrderItem> Items { get; set; } = [];
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
    /// <summary>Readable description of the variant, e.g. "Medida 34 · Color Cedro".</summary>
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
    public const int Phone = 40;
    public const int Locality = 120;
    public const int Address = 200;
    public const int Province = 60;
    public const int Carrier = 200;
    public const int Comments = 500;
    public const int VariantLabel = 1000;

    public const int MaxLines = 100;
    public const int MaxQuantity = 100_000;
    /// <summary>Largest amount the numeric(12,2) money columns of an order can hold.</summary>
    public const decimal MaxAmount = 9_999_999_999.99m;
}

/// <summary>Provinces served through a carrier. Mirrors the list offered by the order form of the site.</summary>
public static class Provinces
{
    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
        "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
        "Santiago del Estero", "Tierra del Fuego", "Tucumán",
    };
}
