using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using System.Text.Json.Serialization;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

// ---- Requests ----
public record CategoryRequest(string Name, string? Slug, string? Description, int SortOrder, bool IsActive, List<int> AttributeIds);
public record AttributeRequest(string Name, string? Slug, int SortOrder);
public record AttributeValueRequest(string Label, int SortOrder, string? ColorHex);
public record ProductRequest(int CategoryId, string Name, string? Slug, string? Description, int SortOrder, bool IsActive, List<int> AllowedValueIds);
/// <summary>
/// Partial update. Prices follow JSON presence: an omitted price stays as it is, an explicit null clears it.
/// The serializer only calls a property setter when the field is present, which is what the flags record.
/// </summary>
public record VariantPatchRequest(Availability? Availability, bool? IsActive)
{
    readonly decimal? _retailPrice;
    readonly decimal? _wholesalePrice;

    public decimal? RetailPrice { get => _retailPrice; init { _retailPrice = value; HasRetailPrice = true; } }
    public decimal? WholesalePrice { get => _wholesalePrice; init { _wholesalePrice = value; HasWholesalePrice = true; } }

    [JsonIgnore] public bool HasRetailPrice { get; private init; }
    [JsonIgnore] public bool HasWholesalePrice { get; private init; }
}
/// <summary>Both prices are always applied as sent: null clears the price.</summary>
public record VariantPriceItem(int VariantId, decimal? RetailPrice, decimal? WholesalePrice);
public record VariantPricesRequest(List<VariantPriceItem> Prices);
public record ProductBulkDeleteRequest(List<int> Ids);
public record VariantBulkRequest(int ProductId, List<int> ValueIds, Availability Availability);
public record SettingsRequest(string WhatsappNumber, int WholesaleThreshold);

// ---- Responses ----
public record AdminCategoryDto(int Id, string Name, string Slug, string? Description, int SortOrder, bool IsActive, List<int> AttributeIds, int ProductCount);
public record AdminValueDto(int Id, string Label, int SortOrder, string? ColorHex);
public record AdminAttributeDto(int Id, string Name, string Slug, int SortOrder, List<AdminValueDto> Values);
public record AdminProductSummaryDto(int Id, int CategoryId, string CategoryName, string Name, string Slug, bool IsActive, int SortOrder, int ActiveVariants, int OnRequestVariants, string? CoverUrl);
public record AdminVariantDto(int Id, string Sku, List<int> ValueIds, Availability Availability, bool IsActive, decimal? RetailPrice, decimal? WholesalePrice);
public record AdminMediaDto(int Id, MediaType Type, string Url, int? AttributeValueId, int SortOrder);
public record AdminProductDto(
    int Id, int CategoryId, string Name, string Slug, string? Description, int SortOrder, bool IsActive,
    List<int> AllowedValueIds, List<AdminAttributeDto> CategoryAttributes, List<AdminVariantDto> Variants, List<AdminMediaDto> Media);
public record AdminSettingsDto(string WhatsappNumber, int WholesaleThreshold);

// ---- Validators ----
public class CategoryRequestValidator : AbstractValidator<CategoryRequest>
{
    public CategoryRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120).SingleLine().ProducesSlug(x => x.Slug);
        RuleFor(x => x.Slug).MaximumLength(140);
        RuleFor(x => x.Description).FreeText(2000);
        RuleFor(x => x.SortOrder).ValidSortOrder();
        RuleFor(x => x.AttributeIds).IdList(50);
    }
}

public class AttributeRequestValidator : AbstractValidator<AttributeRequest>
{
    public AttributeRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(80).SingleLine().ProducesSlug(x => x.Slug);
        RuleFor(x => x.Slug).MaximumLength(100);
        RuleFor(x => x.SortOrder).ValidSortOrder();
    }
}

public class AttributeValueRequestValidator : AbstractValidator<AttributeValueRequest>
{
    public AttributeValueRequestValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(80).SingleLine();
        RuleFor(x => x.SortOrder).ValidSortOrder();
        RuleFor(x => x.ColorHex).Matches("^#[0-9A-Fa-f]{6}$").When(x => !string.IsNullOrEmpty(x.ColorHex))
            .WithMessage("Usá el formato #RRGGBB");
    }
}

public class ProductRequestValidator : AbstractValidator<ProductRequest>
{
    public ProductRequestValidator()
    {
        RuleFor(x => x.CategoryId).GreaterThan(0);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(160).SingleLine().ProducesSlug(x => x.Slug);
        RuleFor(x => x.Slug).MaximumLength(180);
        RuleFor(x => x.Description).FreeText(2000);
        RuleFor(x => x.SortOrder).ValidSortOrder();
        RuleFor(x => x.AllowedValueIds).IdList(500);
    }
}

public class VariantPatchRequestValidator : AbstractValidator<VariantPatchRequest>
{
    public VariantPatchRequestValidator()
    {
        RuleFor(x => x.Availability).IsInEnum();
        RuleFor(x => x.RetailPrice).ValidPrice();
        RuleFor(x => x.WholesalePrice).ValidPrice();
    }
}

public class VariantPricesRequestValidator : AbstractValidator<VariantPricesRequest>
{
    public const int MaxItems = 1000;

    public VariantPricesRequestValidator()
    {
        RuleFor(x => x.Prices).Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(items => items.Count <= MaxItems).WithMessage($"Hasta {MaxItems} variantes por solicitud")
            .Must(items => items.All(i => i is not null)).WithMessage("Hay elementos vacíos")
            .Must(items => items.Select(i => i.VariantId).Distinct().Count() == items.Count)
            .WithMessage("Cada variante puede aparecer una sola vez");
        RuleForEach(x => x.Prices).Where(i => i is not null).ChildRules(item =>
        {
            item.RuleFor(i => i.VariantId).GreaterThan(0);
            item.RuleFor(i => i.RetailPrice).ValidPrice();
            item.RuleFor(i => i.WholesalePrice).ValidPrice();
        });
    }
}

public class ProductBulkDeleteRequestValidator : AbstractValidator<ProductBulkDeleteRequest>
{
    public const int MaxItems = 500;

    public ProductBulkDeleteRequestValidator()
    {
        RuleFor(x => x.Ids).Cascade(CascadeMode.Stop).NotEmpty().IdList(MaxItems);
    }
}

public class VariantBulkRequestValidator : AbstractValidator<VariantBulkRequest>
{
    public VariantBulkRequestValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.ValueIds).IdList(50);
        RuleFor(x => x.Availability).IsInEnum();
    }
}

public class SettingsRequestValidator : AbstractValidator<SettingsRequest>
{
    public SettingsRequestValidator()
    {
        RuleFor(x => x.WhatsappNumber).NotEmpty().Matches(@"^\+?[0-9 \-]{8,20}$")
            .WithMessage("Número con código de país, p. ej. 5491122334455");
        RuleFor(x => x.WholesaleThreshold).InclusiveBetween(1, 1_000_000);
    }
}

public static class AdminCatalogEndpoints
{
    public static RouteGroupBuilder MapAdminCatalogEndpoints(this RouteGroupBuilder admin)
    {
        MapCategories(admin);
        MapAttributes(admin);
        MapProducts(admin);
        MapVariants(admin);
        MapSettings(admin);
        return admin;
    }

    static void MapCategories(RouteGroupBuilder admin)
    {
        admin.MapGet("/categories", async (AppDbContext db, CancellationToken ct) =>
            await db.Categories
                .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
                .Select(c => new AdminCategoryDto(c.Id, c.Name, c.Slug, c.Description, c.SortOrder, c.IsActive,
                    c.Attributes.OrderBy(a => a.SortOrder).Select(a => a.AttributeId).ToList(), c.Products.Count))
                .ToListAsync(ct));

        admin.MapPost("/categories", async (CategoryRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var slug = Slug.From(string.IsNullOrWhiteSpace(req.Slug) ? req.Name : req.Slug);
            if (await db.Categories.AnyAsync(c => c.Slug == slug, ct)) return ValidationExtensions.Conflict($"Ya existe una categoría con el slug '{slug}'");
            if (await UnknownAttributes(db, req.AttributeIds, ct)) return Results.ValidationProblem(new Dictionary<string, string[]> { ["attributeIds"] = ["Atributo inexistente"] });

            var category = new Category { Name = req.Name.Trim(), Slug = slug, Description = req.Description, SortOrder = req.SortOrder, IsActive = req.IsActive };
            category.Attributes = req.AttributeIds.Distinct().Select((id, i) => new CategoryAttribute { AttributeId = id, SortOrder = i }).ToList();
            db.Categories.Add(category);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/categories/{category.Id}", new { category.Id, category.Slug });
        }).Validate<CategoryRequest>();

        admin.MapPut("/categories/{id:int}", async (int id, CategoryRequest req, AppDbContext db, VariantGenerator generator, CancellationToken ct) =>
        {
            var category = await db.Categories.Include(c => c.Attributes).FirstOrDefaultAsync(c => c.Id == id, ct);
            if (category is null) return Results.NotFound();
            var slug = Slug.From(string.IsNullOrWhiteSpace(req.Slug) ? req.Name : req.Slug);
            if (await db.Categories.AnyAsync(c => c.Slug == slug && c.Id != id, ct)) return ValidationExtensions.Conflict($"Ya existe una categoría con el slug '{slug}'");
            if (await UnknownAttributes(db, req.AttributeIds, ct)) return Results.ValidationProblem(new Dictionary<string, string[]> { ["attributeIds"] = ["Atributo inexistente"] });

            var attributesChanged = !category.Attributes.OrderBy(a => a.SortOrder).Select(a => a.AttributeId).SequenceEqual(req.AttributeIds.Distinct());
            // Category and variant regeneration commit together: a failed regeneration leaves the category untouched.
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            category.Name = req.Name.Trim();
            category.Slug = slug;
            category.Description = req.Description;
            category.SortOrder = req.SortOrder;
            category.IsActive = req.IsActive;
            SyncCategoryAttributes(category, req.AttributeIds.Distinct().ToList());
            await db.SaveChangesAsync(ct);

            // Si cambian los atributos de la categoría, las combinaciones de sus productos también cambian.
            if (attributesChanged)
            {
                foreach (var productId in await db.Products.Where(p => p.CategoryId == id).Select(p => p.Id).ToListAsync(ct))
                {
                    await generator.GenerateAsync(productId, ct);
                }
            }
            await tx.CommitAsync(ct);
            return Results.NoContent();
        }).Validate<CategoryRequest>();

        admin.MapDelete("/categories/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
        {
            var category = await db.Categories.FindAsync([id], ct);
            if (category is null) return Results.NotFound();
            if (await db.Products.AnyAsync(p => p.CategoryId == id, ct)) return ValidationExtensions.Conflict("La categoría tiene productos. Movelos o eliminalos antes, o desactivá la categoría.");
            db.Categories.Remove(category);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    static void MapAttributes(RouteGroupBuilder admin)
    {
        admin.MapGet("/attributes", async (AppDbContext db, CancellationToken ct) =>
            await db.Attributes
                .OrderBy(a => a.SortOrder).ThenBy(a => a.Name)
                .Select(a => new AdminAttributeDto(a.Id, a.Name, a.Slug, a.SortOrder,
                    a.Values.OrderBy(v => v.SortOrder).Select(v => new AdminValueDto(v.Id, v.Label, v.SortOrder, v.ColorHex)).ToList()))
                .ToListAsync(ct));

        admin.MapPost("/attributes", async (AttributeRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var slug = Slug.From(string.IsNullOrWhiteSpace(req.Slug) ? req.Name : req.Slug);
            if (await db.Attributes.AnyAsync(a => a.Slug == slug, ct)) return ValidationExtensions.Conflict($"Ya existe un atributo con el slug '{slug}'");
            var attr = new CatalogAttribute { Name = req.Name.Trim(), Slug = slug, SortOrder = req.SortOrder };
            db.Attributes.Add(attr);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/attributes/{attr.Id}", new { attr.Id, attr.Slug });
        }).Validate<AttributeRequest>();

        admin.MapPut("/attributes/{id:int}", async (int id, AttributeRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var attr = await db.Attributes.FindAsync([id], ct);
            if (attr is null) return Results.NotFound();
            var slug = Slug.From(string.IsNullOrWhiteSpace(req.Slug) ? req.Name : req.Slug);
            if (await db.Attributes.AnyAsync(a => a.Slug == slug && a.Id != id, ct)) return ValidationExtensions.Conflict($"Ya existe un atributo con el slug '{slug}'");
            attr.Name = req.Name.Trim();
            attr.Slug = slug;
            attr.SortOrder = req.SortOrder;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).Validate<AttributeRequest>();

        admin.MapDelete("/attributes/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
        {
            var attr = await db.Attributes.Include(a => a.Values).FirstOrDefaultAsync(a => a.Id == id, ct);
            if (attr is null) return Results.NotFound();
            if (await db.CategoryAttributes.AnyAsync(ca => ca.AttributeId == id, ct)) return ValidationExtensions.Conflict("El atributo está asignado a una categoría.");
            var valueIds = attr.Values.Select(v => v.Id).ToList();
            if (await ValuesInUse(db, valueIds, ct)) return ValidationExtensions.Conflict("Hay productos que usan valores de este atributo.");
            db.Attributes.Remove(attr);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        admin.MapPost("/attributes/{id:int}/values", async (int id, AttributeValueRequest req, AppDbContext db, CancellationToken ct) =>
        {
            if (!await db.Attributes.AnyAsync(a => a.Id == id, ct)) return Results.NotFound();
            var label = req.Label.Trim();
            if (await db.AttributeValues.AnyAsync(v => v.AttributeId == id && v.Label == label, ct)) return ValidationExtensions.Conflict($"El valor '{label}' ya existe");
            var value = new AttributeValue { AttributeId = id, Label = label, SortOrder = req.SortOrder, ColorHex = NullIfEmpty(req.ColorHex) };
            db.AttributeValues.Add(value);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/attribute-values/{value.Id}", new { value.Id });
        }).Validate<AttributeValueRequest>();

        admin.MapPut("/attribute-values/{id:int}", async (int id, AttributeValueRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var value = await db.AttributeValues.FindAsync([id], ct);
            if (value is null) return Results.NotFound();
            var label = req.Label.Trim();
            if (await db.AttributeValues.AnyAsync(v => v.AttributeId == value.AttributeId && v.Label == label && v.Id != id, ct)) return ValidationExtensions.Conflict($"El valor '{label}' ya existe");
            value.Label = label;
            value.SortOrder = req.SortOrder;
            value.ColorHex = NullIfEmpty(req.ColorHex);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).Validate<AttributeValueRequest>();

        admin.MapDelete("/attribute-values/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
        {
            var value = await db.AttributeValues.FindAsync([id], ct);
            if (value is null) return Results.NotFound();
            if (await ValuesInUse(db, [id], ct)) return ValidationExtensions.Conflict("Hay productos que usan este valor. Quitalo de los productos primero.");
            db.AttributeValues.Remove(value);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    static void MapProducts(RouteGroupBuilder admin)
    {
        admin.MapGet("/products", async (int? categoryId, AppDbContext db, CancellationToken ct) =>
            await db.Products
                .Where(p => categoryId == null || p.CategoryId == categoryId)
                .OrderBy(p => p.Category.SortOrder).ThenBy(p => p.SortOrder).ThenBy(p => p.Name)
                .Select(p => new AdminProductSummaryDto(p.Id, p.CategoryId, p.Category.Name, p.Name, p.Slug, p.IsActive, p.SortOrder,
                    p.Variants.Count(v => v.IsActive),
                    p.Variants.Count(v => v.IsActive && v.Availability == Availability.APedido),
                    p.Media.Where(m => m.Type == MediaType.Image).OrderBy(m => m.SortOrder).Select(m => m.Url).FirstOrDefault()))
                .ToListAsync(ct));

        admin.MapGet("/products/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
        {
            var p = await db.Products.AsNoTracking()
                .Include(x => x.Category).ThenInclude(c => c.Attributes).ThenInclude(ca => ca.Attribute).ThenInclude(a => a.Values)
                .Include(x => x.AllowedValues)
                .Include(x => x.Variants).ThenInclude(v => v.Values)
                .Include(x => x.Media)
                .AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == id, ct);
            if (p is null) return Results.NotFound();

            return Results.Ok(new AdminProductDto(
                p.Id, p.CategoryId, p.Name, p.Slug, p.Description, p.SortOrder, p.IsActive,
                p.AllowedValues.Select(a => a.AttributeValueId).Order().ToList(),
                p.Category.Attributes.OrderBy(ca => ca.SortOrder)
                    .Select(ca => new AdminAttributeDto(ca.Attribute.Id, ca.Attribute.Name, ca.Attribute.Slug, ca.SortOrder,
                        ca.Attribute.Values.OrderBy(v => v.SortOrder).Select(v => new AdminValueDto(v.Id, v.Label, v.SortOrder, v.ColorHex)).ToList()))
                    .ToList(),
                p.Variants.OrderBy(v => v.Id)
                    .Select(v => new AdminVariantDto(v.Id, v.Sku, v.Values.Select(x => x.AttributeValueId).Order().ToList(), v.Availability, v.IsActive, v.RetailPrice, v.WholesalePrice))
                    .ToList(),
                p.Media.OrderBy(m => m.SortOrder).Select(m => new AdminMediaDto(m.Id, m.Type, m.Url, m.AttributeValueId, m.SortOrder)).ToList()));
        });

        admin.MapPost("/products", async (ProductRequest req, AppDbContext db, VariantGenerator generator, CancellationToken ct) =>
        {
            var slug = Slug.From(string.IsNullOrWhiteSpace(req.Slug) ? req.Name : req.Slug);
            if (await db.Products.AnyAsync(p => p.Slug == slug, ct)) return ValidationExtensions.Conflict($"Ya existe un producto con el slug '{slug}'");
            var error = await ValidateProductValues(db, req, ct);
            if (error is not null) return error;

            var product = new Product
            {
                CategoryId = req.CategoryId, Name = req.Name.Trim(), Slug = slug, Description = req.Description,
                SortOrder = req.SortOrder, IsActive = req.IsActive,
                AllowedValues = req.AllowedValueIds.Distinct().Select(v => new ProductAllowedValue { AttributeValueId = v }).ToList(),
            };
            // The product is saved first (its id goes into the SKUs); the transaction keeps it from
            // surviving a failed variant generation.
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            db.Products.Add(product);
            await db.SaveChangesAsync(ct);
            var generated = await generator.GenerateAsync(product.Id, ct);
            await tx.CommitAsync(ct);
            return Results.Created($"/api/admin/products/{product.Id}", new { product.Id, product.Slug, Variants = generated });
        }).Validate<ProductRequest>();

        admin.MapPut("/products/{id:int}", async (int id, ProductRequest req, AppDbContext db, VariantGenerator generator, CancellationToken ct) =>
        {
            var product = await db.Products.Include(p => p.AllowedValues).FirstOrDefaultAsync(p => p.Id == id, ct);
            if (product is null) return Results.NotFound();
            var slug = Slug.From(string.IsNullOrWhiteSpace(req.Slug) ? req.Name : req.Slug);
            if (await db.Products.AnyAsync(p => p.Slug == slug && p.Id != id, ct)) return ValidationExtensions.Conflict($"Ya existe un producto con el slug '{slug}'");
            var error = await ValidateProductValues(db, req, ct);
            if (error is not null) return error;

            // Product changes and variant regeneration commit together.
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            product.CategoryId = req.CategoryId;
            product.Name = req.Name.Trim();
            product.Slug = slug;
            product.Description = req.Description;
            product.SortOrder = req.SortOrder;
            product.IsActive = req.IsActive;
            var wanted = req.AllowedValueIds.ToHashSet();
            product.AllowedValues.RemoveAll(a => !wanted.Contains(a.AttributeValueId));
            foreach (var valueId in wanted.Where(v => product.AllowedValues.All(a => a.AttributeValueId != v)))
            {
                product.AllowedValues.Add(new ProductAllowedValue { ProductId = id, AttributeValueId = valueId });
            }
            await db.SaveChangesAsync(ct);
            var generated = await generator.GenerateAsync(id, ct);
            await tx.CommitAsync(ct);
            return Results.Ok(new { Variants = generated });
        }).Validate<ProductRequest>();

        admin.MapDelete("/products/{id:int}", async (int id, AppDbContext db, IMediaStorage storage, CancellationToken ct) =>
        {
            var product = await db.Products.Include(p => p.Media).FirstOrDefaultAsync(p => p.Id == id, ct);
            if (product is null) return Results.NotFound();
            foreach (var media in product.Media.Where(m => m.CloudinaryPublicId is not null))
            {
                await storage.DeleteAsync(media.CloudinaryPublicId!, media.Type, ct);
            }
            db.Products.Remove(product);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Deletes several products in one request. All or nothing: an unknown id rejects the whole request.
        // Duplicated ids are ignored. Media is removed from storage before the products, as in the single delete.
        admin.MapPost("/products/bulk-delete", async (ProductBulkDeleteRequest req, AppDbContext db, IMediaStorage storage, CancellationToken ct) =>
        {
            var ids = req.Ids.Distinct().ToList();
            var products = await db.Products.Include(p => p.Media).Where(p => ids.Contains(p.Id)).ToListAsync(ct);
            if (products.Count != ids.Count)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["ids"] = ["Hay productos inexistentes"] });
            }

            foreach (var media in products.SelectMany(p => p.Media).Where(m => m.CloudinaryPublicId is not null))
            {
                await storage.DeleteAsync(media.CloudinaryPublicId!, media.Type, ct);
            }
            db.Products.RemoveRange(products);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Deleted = products.Count });
        }).Validate<ProductBulkDeleteRequest>();

        admin.MapPost("/products/{id:int}/variants/generate", async (int id, AppDbContext db, VariantGenerator generator, CancellationToken ct) =>
            await db.Products.AnyAsync(p => p.Id == id, ct)
                ? Results.Ok(await generator.GenerateAsync(id, ct))
                : Results.NotFound());

        // Sets both prices of several variants of the product in one request. All or nothing:
        // a variant id that does not belong to the product rejects the whole request.
        admin.MapPut("/products/{id:int}/variants/prices", async (int id, VariantPricesRequest req, AppDbContext db, CancellationToken ct) =>
        {
            if (!await db.Products.AnyAsync(p => p.Id == id, ct)) return Results.NotFound();

            var ids = req.Prices.Select(i => i.VariantId).ToList();
            var variants = await db.Variants.Where(v => v.ProductId == id && ids.Contains(v.Id)).ToDictionaryAsync(v => v.Id, ct);
            if (variants.Count != ids.Count)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["prices"] = ["Hay variantes que no pertenecen al producto"] });
            }

            foreach (var item in req.Prices)
            {
                variants[item.VariantId].RetailPrice = item.RetailPrice;
                variants[item.VariantId].WholesalePrice = item.WholesalePrice;
            }
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Updated = variants.Count });
        }).Validate<VariantPricesRequest>();
    }

    static void MapVariants(RouteGroupBuilder admin)
    {
        admin.MapPatch("/variants/{id:int}", async (int id, VariantPatchRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var variant = await db.Variants.FindAsync([id], ct);
            if (variant is null) return Results.NotFound();
            if (req.Availability is { } availability) variant.Availability = availability;
            if (req.IsActive is { } active) variant.IsActive = active;
            if (req.HasRetailPrice) variant.RetailPrice = req.RetailPrice;
            if (req.HasWholesalePrice) variant.WholesalePrice = req.WholesalePrice;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new AdminVariantDto(variant.Id, variant.Sku, [], variant.Availability, variant.IsActive, variant.RetailPrice, variant.WholesalePrice));
        }).Validate<VariantPatchRequest>();

        // Cambia la disponibilidad de todas las variantes del producto que contengan todos los valores indicados
        // (lista vacía = todas). Ej.: todo "Cedro" + "34" → a pedido.
        admin.MapPatch("/variants/bulk", async (VariantBulkRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var valueIds = req.ValueIds.Distinct().ToList();
            var query = db.Variants.Where(v => v.ProductId == req.ProductId && v.IsActive);
            foreach (var valueId in valueIds)
            {
                query = query.Where(v => v.Values.Any(x => x.AttributeValueId == valueId));
            }
            var updated = await query.ExecuteUpdateAsync(s => s.SetProperty(v => v.Availability, req.Availability), ct);
            return Results.Ok(new { Updated = updated });
        }).Validate<VariantBulkRequest>();
    }

    static void MapSettings(RouteGroupBuilder admin)
    {
        admin.MapGet("/settings", async (AppDbContext db, CancellationToken ct) =>
        {
            var s = await db.Settings.ToDictionaryAsync(x => x.Key, x => x.Value, ct);
            return new AdminSettingsDto(
                s.GetValueOrDefault(SettingKeys.WhatsappNumber, ""),
                int.TryParse(s.GetValueOrDefault(SettingKeys.WholesaleThreshold), out var t) ? t : 100);
        });

        admin.MapPut("/settings", async (SettingsRequest req, AppDbContext db, CancellationToken ct) =>
        {
            await Upsert(db, SettingKeys.WhatsappNumber, new string(req.WhatsappNumber.Where(char.IsDigit).ToArray()), ct);
            await Upsert(db, SettingKeys.WholesaleThreshold, req.WholesaleThreshold.ToString(), ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).Validate<SettingsRequest>();
    }

    static async Task Upsert(AppDbContext db, string key, string value, CancellationToken ct)
    {
        var setting = await db.Settings.FindAsync([key], ct);
        if (setting is null) db.Settings.Add(new Setting { Key = key, Value = value });
        else setting.Value = value;
    }

    static async Task<bool> UnknownAttributes(AppDbContext db, List<int> ids, CancellationToken ct)
    {
        var distinct = ids.Distinct().ToList();
        return await db.Attributes.CountAsync(a => distinct.Contains(a.Id), ct) != distinct.Count;
    }

    static async Task<bool> ValuesInUse(AppDbContext db, List<int> valueIds, CancellationToken ct) =>
        await db.ProductAllowedValues.AnyAsync(a => valueIds.Contains(a.AttributeValueId), ct)
        || await db.VariantValues.AnyAsync(v => valueIds.Contains(v.AttributeValueId), ct);

    /// <summary>La categoría debe existir y los valores permitidos deben pertenecer a atributos de esa categoría.</summary>
    static async Task<IResult?> ValidateProductValues(AppDbContext db, ProductRequest req, CancellationToken ct)
    {
        var attributeIds = await db.CategoryAttributes.Where(ca => ca.CategoryId == req.CategoryId).Select(ca => ca.AttributeId).ToListAsync(ct);
        if (!await db.Categories.AnyAsync(c => c.Id == req.CategoryId, ct))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["categoryId"] = ["La categoría no existe"] });
        }

        var ids = req.AllowedValueIds.Distinct().ToList();
        var valid = await db.AttributeValues.CountAsync(v => ids.Contains(v.Id) && attributeIds.Contains(v.AttributeId), ct);
        return valid == ids.Count
            ? null
            : Results.ValidationProblem(new Dictionary<string, string[]> { ["allowedValueIds"] = ["Hay valores que no corresponden a los atributos de la categoría"] });
    }

    static void SyncCategoryAttributes(Category category, List<int> attributeIds)
    {
        category.Attributes.RemoveAll(ca => !attributeIds.Contains(ca.AttributeId));
        for (var i = 0; i < attributeIds.Count; i++)
        {
            var existing = category.Attributes.FirstOrDefault(ca => ca.AttributeId == attributeIds[i]);
            if (existing is null) category.Attributes.Add(new CategoryAttribute { CategoryId = category.Id, AttributeId = attributeIds[i], SortOrder = i });
            else existing.SortOrder = i;
        }
    }

    static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
