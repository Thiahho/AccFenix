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
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public required string Sku { get; set; }
    /// <summary>Clave canónica de la combinación: ids de valores ordenados, separados por '-'.</summary>
    public required string CombinationKey { get; set; }
    public Availability Availability { get; set; } = Availability.Disponible;
    public bool IsActive { get; set; } = true;

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

public class AdminUser
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public string PasswordHash { get; set; } = "";
}
