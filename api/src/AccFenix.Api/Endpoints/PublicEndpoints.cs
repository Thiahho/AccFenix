using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

// DTOs públicos. Por diseño ningún DTO expone precios: el sistema no los maneja.
public record CategoryDto(int Id, string Name, string Slug, string? Description, int ProductCount);

public record ProductSummaryDto(int Id, string Name, string Slug, string? Description, string? CoverUrl);

public record CategoryProductsDto(CategoryDto Category, List<ProductSummaryDto> Products);

public record ValueDto(int Id, string Label, string? ColorHex);

public record AttributeDto(int Id, string Name, string Slug, List<ValueDto> Values);

public record VariantDto(int Id, string Sku, List<int> ValueIds, Availability Availability);

public record MediaDto(int Id, MediaType Type, string Url, int? AttributeValueId);

public record ProductDetailDto(
    int Id, string Name, string Slug, string? Description,
    CategoryRefDto Category, List<AttributeDto> Attributes, List<VariantDto> Variants, List<MediaDto> Media);

public record CategoryRefDto(string Name, string Slug);

public record VariantStatusDto(int Id, bool IsActive, Availability Availability);

public record PublicSettingsDto(string WhatsappNumber, int WholesaleThreshold);

public static class PublicEndpoints
{
    public static void MapPublicEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api").WithTags("Public");

        api.MapGet("/categories", async (AppDbContext db, CancellationToken ct) =>
            await db.Categories
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
                .Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Description, c.Products.Count(p => p.IsActive)))
                .ToListAsync(ct));

        api.MapGet("/categories/{slug}/products", async (string slug, AppDbContext db, CancellationToken ct) =>
        {
            // Un slug mal formado no puede existir: no llega a la base.
            if (!Slug.IsValid(slug)) return Results.NotFound();

            var category = await db.Categories
                .Where(c => c.IsActive && c.Slug == slug)
                .Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Description, c.Products.Count(p => p.IsActive)))
                .FirstOrDefaultAsync(ct);
            if (category is null) return Results.NotFound();

            var products = await db.Products
                .Where(p => p.IsActive && p.CategoryId == category.Id)
                .OrderBy(p => p.SortOrder).ThenBy(p => p.Name)
                .Select(p => new ProductSummaryDto(p.Id, p.Name, p.Slug, p.Description,
                    p.Media.Where(m => m.Type == MediaType.Image).OrderBy(m => m.SortOrder).Select(m => m.Url).FirstOrDefault()))
                .ToListAsync(ct);

            return Results.Ok(new CategoryProductsDto(category, products));
        });

        api.MapGet("/products/{slug}", async (string slug, AppDbContext db, CancellationToken ct) =>
        {
            if (!Slug.IsValid(slug)) return Results.NotFound();

            var product = await db.Products.AsNoTracking()
                .Include(p => p.Category).ThenInclude(c => c.Attributes).ThenInclude(ca => ca.Attribute)
                .Include(p => p.AllowedValues).ThenInclude(a => a.AttributeValue)
                .Include(p => p.Variants.Where(v => v.IsActive)).ThenInclude(v => v.Values)
                .Include(p => p.Media)
                .AsSplitQuery()
                .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive && p.Category.IsActive, ct);
            if (product is null) return Results.NotFound();

            return Results.Ok(ToDetail(product));
        });

        // Usado por el carrito para descartar variantes que ya no existen y refrescar disponibilidad.
        api.MapGet("/variants", async (string ids, AppDbContext db, CancellationToken ct) =>
        {
            var idList = ids.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0)
                .Where(id => id > 0).Distinct().Take(200).ToList();

            return await db.Variants
                .Where(v => idList.Contains(v.Id))
                .Select(v => new VariantStatusDto(v.Id, v.IsActive && v.Product.IsActive && v.Product.Category.IsActive, v.Availability))
                .ToListAsync(ct);
        });

        api.MapGet("/settings/public", async (AppDbContext db, CancellationToken ct) =>
        {
            var settings = await db.Settings.ToDictionaryAsync(s => s.Key, s => s.Value, ct);
            return new PublicSettingsDto(
                settings.GetValueOrDefault(SettingKeys.WhatsappNumber, ""),
                int.TryParse(settings.GetValueOrDefault(SettingKeys.WholesaleThreshold), out var t) ? t : 100);
        });
    }

    static ProductDetailDto ToDetail(Product p)
    {
        var allowed = p.AllowedValues.Select(a => a.AttributeValue).ToList();
        var attributes = p.Category.Attributes
            .OrderBy(ca => ca.SortOrder)
            .Select(ca => new AttributeDto(ca.Attribute.Id, ca.Attribute.Name, ca.Attribute.Slug,
                allowed.Where(v => v.AttributeId == ca.AttributeId)
                    .OrderBy(v => v.SortOrder)
                    .Select(v => new ValueDto(v.Id, v.Label, v.ColorHex))
                    .ToList()))
            .Where(a => a.Values.Count > 0)
            .ToList();

        return new ProductDetailDto(
            p.Id, p.Name, p.Slug, p.Description,
            new CategoryRefDto(p.Category.Name, p.Category.Slug),
            attributes,
            p.Variants.OrderBy(v => v.Id)
                .Select(v => new VariantDto(v.Id, v.Sku, v.Values.Select(x => x.AttributeValueId).Order().ToList(), v.Availability))
                .ToList(),
            p.Media.OrderBy(m => m.SortOrder)
                .Select(m => new MediaDto(m.Id, m.Type, m.Url, m.AttributeValueId))
                .ToList());
    }
}
