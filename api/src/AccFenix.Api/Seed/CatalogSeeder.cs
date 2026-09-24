using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Seed;

/// <summary>Carga inicial del catálogo según el acta. Es idempotente: solo agrega lo que falta.</summary>
public class CatalogSeeder(AppDbContext db, VariantGenerator generator, IConfiguration config, ILogger<CatalogSeeder> logger)
{
    static readonly string[] Medidas = ["1.20", "1.40", "1.60", "1.80", "2.00", "2.20", "2.40", "2.60", "2.80", "3.00"];
    static readonly string[] Grosores = ["22", "34"];
    static readonly (string Label, string Hex)[] Colores = [("Natural", "#D8B98A"), ("Caoba", "#6B2E1F"), ("Cedro", "#A0522D")];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var medida = await EnsureAttributeAsync("Medida", 0, Medidas.Select(m => (m, (string?)null)), ct);
        var grosor = await EnsureAttributeAsync("Grosor", 1, Grosores.Select(g => (g, (string?)null)), ct);
        var color = await EnsureAttributeAsync("Color", 2, Colores.Select(c => (c.Label, (string?)c.Hex)), ct);

        var barrales = await EnsureCategoryAsync("Barrales", 0, "Barrales de madera en 10 medidas, 2 grosores y 3 colores.", [medida, grosor, color], ct);
        var accesorios = await EnsureCategoryAsync("Accesorios", 1, "Soportes, argollas y terminales para cada grosor y color.", [grosor, color], ct);
        var kits = await EnsureCategoryAsync("Kits", 2, "Barral con sus accesorios, listo para instalar.", [medida, grosor, color], ct);

        var allGrosor = grosor.Values.ToList();
        var allColor = color.Values.ToList();
        var corto = medida.Values.Where(v => string.CompareOrdinal(v.Label, "1.60") <= 0).ToList();
        var largo = medida.Values.Where(v => string.CompareOrdinal(v.Label, "1.80") >= 0).ToList();

        var products = new List<Product>
        {
            await EnsureProductAsync(barrales, "Barral", 0, "Barral de madera para cortinas.", [.. medida.Values, .. allGrosor, .. allColor], ct),

            await EnsureProductAsync(accesorios, "Soporte Bocha", 0, null, [.. allGrosor, .. allColor], ct),
            await EnsureProductAsync(accesorios, "Soporte Doble", 1, null, [.. allGrosor, .. allColor], ct),
            await EnsureProductAsync(accesorios, "Argollas", 2, null, [.. allGrosor, .. allColor], ct),
            await EnsureProductAsync(accesorios, "Terminales", 3, null, [.. allGrosor, .. allColor], ct),
            await EnsureProductAsync(accesorios, "Soporte Lateral", 4, null, [.. allGrosor, .. allColor], ct),

            await EnsureProductAsync(kits, "Kit 1.20 a 1.60 Simple", 0, "1 barral + 2 soportes + 2 terminales.", [.. corto, .. allGrosor, .. allColor], ct),
            await EnsureProductAsync(kits, "Kit 1.20 a 1.60 Doble", 1, "2 barrales + 2 soportes + 4 terminales.", [.. corto, .. allGrosor, .. allColor], ct),
            await EnsureProductAsync(kits, "Kit 1.80 a 3.00 Simple", 2, "1 barral + 3 soportes + 3 terminales.", [.. largo, .. allGrosor, .. allColor], ct),
            await EnsureProductAsync(kits, "Kit 1.80 a 3.00 Doble", 3, "2 barrales + 3 soportes + 4 terminales.", [.. largo, .. allGrosor, .. allColor], ct),
        };

        foreach (var p in products)
        {
            await generator.GenerateAsync(p.Id, ct);
        }

        await EnsureSettingAsync(SettingKeys.WholesaleThreshold, "100", ct);
        await EnsureSettingAsync(SettingKeys.WhatsappNumber, "5491100000000", ct);
        await EnsureAdminAsync(ct);

        logger.LogInformation("Seed completo: {Products} productos, {Variants} variantes",
            await db.Products.CountAsync(ct), await db.Variants.CountAsync(v => v.IsActive, ct));
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

        email = email.Trim().ToLowerInvariant();
        if (await db.AdminUsers.AnyAsync(u => u.Email == email, ct)) return;

        var user = new AdminUser { Email = email };
        user.PasswordHash = new PasswordHasher<AdminUser>().HashPassword(user, password);
        db.AdminUsers.Add(user);
        await db.SaveChangesAsync(ct);
    }
}
