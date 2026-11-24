namespace AccFenix.Api.Domain;

public class Category
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public List<CategoryAttribute> Attributes { get; set; } = [];
    public List<Product> Products { get; set; } = [];
}

/// <summary>Atributo configurable (Medida, Grosor, Color…). Se llama así para no chocar con System.Attribute.</summary>
public class CatalogAttribute
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public int SortOrder { get; set; }
    /// <summary>Optional paid add-ons (Extras): they do not create variants, and each value has its own price.</summary>
    public bool IsAddon { get; set; }

    public List<AttributeValue> Values { get; set; } = [];
}

public class AttributeValue
{
    public int Id { get; set; }
    public int AttributeId { get; set; }
    public CatalogAttribute Attribute { get; set; } = null!;
    public required string Label { get; set; }
    public int SortOrder { get; set; }
    /// <summary>Color de muestra opcional (#RRGGBB) para atributos de tipo color.</summary>
    public string? ColorHex { get; set; }
    /// <summary>Whole pesos added to the unit price when this add-on is chosen. Without a price it is not offered.</summary>
    public decimal? AddonPrice { get; set; }
}

public class CategoryAttribute
{
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public int AttributeId { get; set; }
    public CatalogAttribute Attribute { get; set; } = null!;
    public int SortOrder { get; set; }
}

public class Product
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    // Optional tasting data; an empty field is simply not shown on the site.
    /// <summary>Scale of 1 to <see cref="CatalogLimits.MaxTasteScale"/>.</summary>
    public int? Intensity { get; set; }
    public CaffeineLevel? Caffeine { get; set; }
    /// <summary>Scale of 1 to <see cref="CatalogLimits.MaxTasteScale"/>.</summary>
    public int? Sweetness { get; set; }
    /// <summary>Comma-separated flavor notes, e.g. "Caramelo, cacao".</summary>
    public string? FlavorNotes { get; set; }

    public List<ProductAllowedValue> AllowedValues { get; set; } = [];
    public List<Variant> Variants { get; set; } = [];
    public List<Media> Media { get; set; } = [];
    public List<Review> Reviews { get; set; } = [];
}

public enum CaffeineLevel
{
    Baja = 0,
    Media = 1,
    Alta = 2,
}

/// <summary>Valores de atributo habilitados para un producto; las variantes se generan a partir de ellos.</summary>
public class ProductAllowedValue
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int AttributeValueId { get; set; }
    public AttributeValue AttributeValue { get; set; } = null!;
}

public enum Availability
{
    Disponible = 0,
    APedido = 1,
}

public class Variant
{
    /// <summary>Max length of a SKU, shared by the variant and the order line snapshot.</summary>
    public const int SkuMaxLength = 120;

    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public required string Sku { get; set; }
    /// <summary>Clave canónica de la combinación: ids de valores ordenados, separados por '-'.</summary>
    public required string CombinationKey { get; set; }
    public Availability Availability { get; set; } = Availability.Disponible;
    public bool IsActive { get; set; } = true;
    /// <summary>Unit price in ARS for retail orders. Null means "price on request".</summary>
    public decimal? RetailPrice { get; set; }

    public List<VariantValue> Values { get; set; } = [];
}

public class VariantValue
{
    public int VariantId { get; set; }
    public Variant Variant { get; set; } = null!;
    public int AttributeValueId { get; set; }
    public AttributeValue AttributeValue { get; set; } = null!;
}

public enum MediaType
{
    Image = 0,
    Video = 1,
}

public class Media
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    /// <summary>Si se indica, la foto corresponde a ese valor (p. ej. un color).</summary>
    public int? AttributeValueId { get; set; }
    public AttributeValue? AttributeValue { get; set; }
    public MediaType Type { get; set; }
    public required string Url { get; set; }
    public string? CloudinaryPublicId { get; set; }
    public int SortOrder { get; set; }
}

public class Setting
{
    public required string Key { get; set; }
    public required string Value { get; set; }
}

public static class SettingKeys
{
    public const string WhatsappNumber = "WhatsappNumber";
    public const string MercadoPagoAlias = "MercadoPagoAlias";
}

/// <summary>Bounds shared by the API validators and the database constraints of the catalog.</summary>
public static class CatalogLimits
{
    public const int MaxSortOrder = 100_000;
    /// <summary>Upper bound for a unit price, in whole pesos; it fits the numeric(12,0) price columns.</summary>
    public const decimal MaxPrice = 99_999_999m;
    public const int MaxTasteScale = 5;
    public const int FlavorNotes = 160;
}

public class AdminUser
{
    public const int SecurityStampMaxLength = 64;

    public int Id { get; set; }
    public required string Email { get; set; }
    public string PasswordHash { get; set; } = "";
    /// <summary>
    /// Copied into every token at login. Changing it (on a password reset) invalidates the tokens issued before.
    /// </summary>
    public string SecurityStamp { get; set; } = NewSecurityStamp();

    public static string NewSecurityStamp() => Guid.NewGuid().ToString("N");
}
