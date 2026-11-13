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
    // PLACEHOLDER: catálogo y precios de referencia a confirmar con el cliente.
    // Presentaciones: Cajón = 360 huevos, Medio cajón = 180, Maple = 30.
    static readonly string[] Presentaciones = ["Cajón", "Medio cajón", "Maple"];

    /// <summary>Precio minorista (ARS) por producto y presentación. El mayorista queda sin cargar (a consultar).</summary>
    static readonly (string Product, string Description, Dictionary<string, decimal> Retail)[] Huevos =
    [
        ("Huevos N°1", "Huevos frescos de granja, calibre N°1.",
            new() { ["Cajón"] = 60000m, ["Medio cajón"] = 35000m, ["Maple"] = 6500m }),
        ("Huevos N°2", "Huevos frescos de granja, calibre N°2.",
            new() { ["Cajón"] = 55000m, ["Medio cajón"] = 27000m, ["Maple"] = 5500m }),
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

        await EnsureSettingAsync(SettingKeys.WholesaleThreshold, "100", ct);
        await EnsureSettingAsync(SettingKeys.WhatsappNumber, "5491122692061", ct);
        await EnsureAdminAsync(ct);

        logger.LogInformation("Seed completo: {Products} productos, {Variants} variantes",
            await db.Products.CountAsync(ct), await db.Variants.CountAsync(v => v.IsActive, ct));
    }

    async Task SeedCatalogAsync(CancellationToken ct)
    {
        var presentacion = await EnsureAttributeAsync("Presentación", 0, Presentaciones.Select(p => (p, (string?)null)), ct);
        var huevos = await EnsureCategoryAsync("Huevos", 0, "Huevos frescos por cajón (360), medio cajón (180) o maple (30).", [presentacion], ct);

        for (var i = 0; i < Huevos.Length; i++)
        {
            var (name, description, retail) = Huevos[i];
            var product = await EnsureProductAsync(huevos, name, i, description, [.. presentacion.Values], ct);
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
