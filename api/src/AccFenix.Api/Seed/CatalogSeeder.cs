using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Seed;

/// <summary>
/// Carga inicial del catálogo según el acta. El catálogo solo se carga si la base no tiene uno:
/// una vez que se administra desde el panel, la base es la única fuente de verdad.
/// Settings y usuario admin se crean solo si faltan.
/// </summary>
public class CatalogSeeder(AppDbContext db, VariantGenerator generator, AdminAccountService admins, IConfiguration config, ILogger<CatalogSeeder> logger)
{
    // Carta de ColdCup (demo). Precios tomados del Instagram del cliente, a confirmar.
    // Tamaños: Chico = 500 cc, Grande = 700 cc. Los extras tienen el mismo precio en ambos tamaños.
    static readonly string[] Tamanos = ["Chico (500 cc)", "Grande (700 cc)"];

    /// <summary>Un producto de la carta con su precio minorista por tamaño, en ARS.</summary>
    static readonly (string Category, string Product, string Description, Dictionary<string, decimal> Retail)[] Carta =
    [
        ("Cafés clásicos", "Latte frío", "Café con leche fría.",
            new() { ["Chico (500 cc)"] = 4500m, ["Grande (700 cc)"] = 6000m }),
        ("Cafés clásicos", "Latte frío vainilla", "Latte frío con jarabe de vainilla.",
            new() { ["Chico (500 cc)"] = 5000m, ["Grande (700 cc)"] = 6500m }),
        ("Cafés clásicos", "Latte frío caramel", "Latte frío con caramelo.",
            new() { ["Chico (500 cc)"] = 5500m, ["Grande (700 cc)"] = 7000m }),
        ("Cafés clásicos", "Latte frío mocca", "Latte frío con chocolate.",
            new() { ["Chico (500 cc)"] = 5000m, ["Grande (700 cc)"] = 6500m }),
        ("Cafés clásicos", "Iced americano", "Café americano con hielo.",
            new() { ["Chico (500 cc)"] = 4000m, ["Grande (700 cc)"] = 5500m }),
        ("Especiales", "Latte frío oreo", "Latte frío con galletita Oreo.",
            new() { ["Chico (500 cc)"] = 7500m, ["Grande (700 cc)"] = 8200m }),
        ("Especiales", "Latte frío tiramisú", "Latte frío estilo tiramisú.",
            new() { ["Chico (500 cc)"] = 7900m, ["Grande (700 cc)"] = 8500m }),
        ("Especiales", "Latte frío banana cream", "Latte frío con banana y crema.",
            new() { ["Chico (500 cc)"] = 7500m, ["Grande (700 cc)"] = 8200m }),
        ("Especiales", "Latte frío cookies and cream", "Latte frío con galletitas cookies and cream.",
            new() { ["Chico (500 cc)"] = 7500m, ["Grande (700 cc)"] = 8500m }),
        ("Refrescantes", "Limonada (menta y jengibre)", "Limonada con menta y jengibre.",
            new() { ["Chico (500 cc)"] = 5500m, ["Grande (700 cc)"] = 6500m }),
        ("Extras", "Extra leche de almendras", "Se suma al producto.",
            new() { ["Chico (500 cc)"] = 1000m, ["Grande (700 cc)"] = 1000m }),
        ("Extras", "Extra leche deslactosada", "Se suma al producto.",
            new() { ["Chico (500 cc)"] = 500m, ["Grande (700 cc)"] = 500m }),
    ];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var hasCatalog = await db.Categories.AnyAsync(ct) || await db.Products.AnyAsync(ct) || await db.Attributes.AnyAsync(ct);
        if (hasCatalog)
        {
            logger.LogInformation("La base ya tiene catálogo; se omite el seed del catálogo");
        }
        else
        {
            await SeedCatalogAsync(ct);
        }

        await EnsureSettingAsync(SettingKeys.WhatsappNumber, "5491122692061", ct);
        await EnsureAdminAsync(ct);

        logger.LogInformation("Seed completo: {Products} productos, {Variants} variantes",
            await db.Products.CountAsync(ct), await db.Variants.CountAsync(v => v.IsActive, ct));
    }

    async Task SeedCatalogAsync(CancellationToken ct)
    {
        var tamano = await EnsureAttributeAsync("Tamaño", 0, Tamanos.Select(t => (t, (string?)null)), ct);
        var attrs = new[] { tamano };
        var categorias = new Dictionary<string, Category>();
        var orden = 0;

        foreach (var (categoria, producto, descripcion, retail) in Carta)
        {
            if (!categorias.TryGetValue(categoria, out var cat))
            {
                cat = await EnsureCategoryAsync(categoria, categorias.Count, $"{categoria} de ColdCup.", attrs, ct);
                categorias[categoria] = cat;
            }

            var product = await EnsureProductAsync(cat, producto, orden++, descripcion, [.. tamano.Values], ct);
            await generator.GenerateAsync(product.Id, ct);
            await SetRetailPricesAsync(product.Id, retail, ct);
        }
    }

    /// <summary>Carga el precio minorista de cada variante según su presentación, sin pisar precios ya cargados.</summary>
    async Task SetRetailPricesAsync(int productId, Dictionary<string, decimal> retail, CancellationToken ct)
    {
        var variants = await db.Variants
            .Include(v => v.Values).ThenInclude(vv => vv.AttributeValue)
            .Where(v => v.ProductId == productId && v.IsActive)
            .ToListAsync(ct);

        foreach (var variant in variants.Where(v => v.RetailPrice is null))
        {
            var label = variant.Values.Select(vv => vv.AttributeValue.Label).FirstOrDefault(retail.ContainsKey);
            if (label is not null)
            {
                variant.RetailPrice = retail[label];
            }
        }

        await db.SaveChangesAsync(ct);
    }

    async Task<CatalogAttribute> EnsureAttributeAsync(string name, int sort, IEnumerable<(string Label, string? Hex)> values, CancellationToken ct)
    {
        var slug = Slug.From(name);
        var attr = await db.Attributes.Include(a => a.Values).FirstOrDefaultAsync(a => a.Slug == slug, ct);
        if (attr is null)
        {
            attr = new CatalogAttribute { Name = name, Slug = slug, SortOrder = sort };
            db.Attributes.Add(attr);
        }

        var i = 0;
        foreach (var (label, hex) in values)
        {
            if (attr.Values.All(v => v.Label != label))
            {
                attr.Values.Add(new AttributeValue { Label = label, ColorHex = hex, SortOrder = i });
            }
            i++;
        }

        await db.SaveChangesAsync(ct);
        return attr;
    }

    async Task<Category> EnsureCategoryAsync(string name, int sort, string description, CatalogAttribute[] attributes, CancellationToken ct)
    {
        var slug = Slug.From(name);
        var cat = await db.Categories.Include(c => c.Attributes).FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (cat is null)
        {
            cat = new Category { Name = name, Slug = slug, SortOrder = sort, Description = description };
            db.Categories.Add(cat);
        }

        for (var i = 0; i < attributes.Length; i++)
        {
            if (cat.Attributes.All(ca => ca.AttributeId != attributes[i].Id))
            {
                cat.Attributes.Add(new CategoryAttribute { AttributeId = attributes[i].Id, SortOrder = i });
            }
        }

        await db.SaveChangesAsync(ct);
        return cat;
    }

    async Task<Product> EnsureProductAsync(Category category, string name, int sort, string? description, AttributeValue[] allowed, CancellationToken ct)
    {
        var slug = Slug.From(name);
        var product = await db.Products.Include(p => p.AllowedValues).FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null)
        {
            product = new Product { CategoryId = category.Id, Name = name, Slug = slug, SortOrder = sort, Description = description };
            db.Products.Add(product);
        }

        foreach (var value in allowed.Where(v => product.AllowedValues.All(a => a.AttributeValueId != v.Id)))
        {
            product.AllowedValues.Add(new ProductAllowedValue { AttributeValueId = value.Id });
        }

        await db.SaveChangesAsync(ct);
        return product;
    }

    async Task EnsureSettingAsync(string key, string value, CancellationToken ct)
    {
        if (!await db.Settings.AnyAsync(s => s.Key == key, ct))
        {
            db.Settings.Add(new Setting { Key = key, Value = value });
            await db.SaveChangesAsync(ct);
        }
    }

    async Task EnsureAdminAsync(CancellationToken ct)
    {
        var email = config["Admin:Email"];
        var password = config["Admin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Admin:Email/Admin:Password no configurados; no se crea usuario admin");
            return;
        }

        await admins.CreateIfMissingAsync(email, password, ct);
    }
}
