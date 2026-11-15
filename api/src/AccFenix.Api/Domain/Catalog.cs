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

    public List<ProductAllowedValue> AllowedValues { get; set; } = [];
    public List<Variant> Variants { get; set; } = [];
    public List<Media> Media { get; set; } = [];
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
    /// <summary>Unit price in ARS once the cart reaches the wholesale threshold. Null means "price on request".</summary>
    public decimal? WholesalePrice { get; set; }

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
    public const string WholesaleThreshold = "WholesaleThreshold";
    public const string WhatsappNumber = "WhatsappNumber";
}

/// <summary>Units from which an order is priced as wholesale, when the setting is missing or invalid.</summary>
public static class WholesaleThreshold
{
    public const int Default = 100;

    /// <summary>The stored setting value, or <see cref="Default"/> when it is missing or not a number.</summary>
    public static int Parse(string? value) => int.TryParse(value, out var threshold) ? threshold : Default;
}

/// <summary>Bounds shared by the API validators and the database constraints of the catalog.</summary>
public static class CatalogLimits
{
    public const int MaxSortOrder = 100_000;
    /// <summary>Upper bound for a unit price; it fits the numeric(12,2) price columns.</summary>
    public const decimal MaxPrice = 99_999_999.99m;
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
