using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

// DTOs públicos. Las variantes exponen precio minorista y mayorista; null significa "a consultar".
public record CategoryDto(int Id, string Name, string Slug, string? Description, int ProductCount);

public record ProductSummaryDto(int Id, string Name, string Slug, string? Description, string? CoverUrl);

public record CategoryProductsDto(CategoryDto Category, List<ProductSummaryDto> Products);

public record ValueDto(int Id, string Label, string? ColorHex);

public record AttributeDto(int Id, string Name, string Slug, List<ValueDto> Values);

public record VariantDto(int Id, string Sku, List<int> ValueIds, Availability Availability, decimal? RetailPrice);

public record MediaDto(int Id, MediaType Type, string Url, int? AttributeValueId);

public record ProductDetailDto(
    int Id, string Name, string Slug, string? Description,
    CategoryRefDto Category, List<AttributeDto> Attributes, List<VariantDto> Variants, List<MediaDto> Media,
    int? Intensity, CaffeineLevel? Caffeine, int? Sweetness, string? FlavorNotes,
    ProductStatsDto Stats, List<PublicReviewDto> Reviews, List<AddonDto> Addons);

/// <summary>An optional extra offered for a product; its price is added to the unit price.</summary>
public record AddonDto(int Id, string Label, decimal Price);

public record AddonPriceDto(int Id, decimal Price);

/// <summary>TimesOrdered counts paid, non-cancelled orders that include the product.</summary>
public record ProductStatsDto(double? AverageRating, int ReviewCount, int TimesOrdered);

public record PublicReviewDto(int Id, string AuthorName, int Rating, string? Comment, DateTime CreatedAt);

public record CategoryRefDto(string Name, string Slug);

public record VariantStatusDto(int Id, bool IsActive, Availability Availability, decimal? RetailPrice, List<AddonPriceDto> Addons);

public record PublicSettingsDto(string WhatsappNumber, string MercadoPagoAlias = "");

public static class PublicEndpoints
{
    const int LatestReviews = 6;

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

            var reviews = db.Reviews.AsNoTracking().Where(r => r.ProductId == product.Id);
            var reviewCount = await reviews.CountAsync(ct);
            double? average = reviewCount == 0 ? null : Math.Round(await reviews.AverageAsync(r => (double)r.Rating, ct), 1);
            var timesOrdered = await db.OrderItems
                .Where(i => i.Variant!.ProductId == product.Id && i.Order.PaymentStatus == PaymentStatus.Approved && i.Order.Status != OrderStatus.Cancelled)
                .Select(i => i.OrderId)
                .Distinct()
                .CountAsync(ct);
            var latest = await reviews
                .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
                .Take(LatestReviews)
                .Select(r => new PublicReviewDto(r.Id, r.AuthorName, r.Rating, r.Comment, r.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(ToDetail(product, new ProductStatsDto(average, reviewCount, timesOrdered), latest));
        });

        // Usado por el carrito para descartar variantes que ya no existen y refrescar disponibilidad y precios.
        api.MapGet("/variants", async (string ids, AppDbContext db, CancellationToken ct) =>
        {
            var idList = ids.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0)
                .Where(id => id > 0).Distinct().Take(200).ToList();

            // A variant that is not publicly visible keeps its status (the cart shows it as unavailable)
            // but never exposes its prices.
            var rows = await db.Variants
                .Where(v => idList.Contains(v.Id))
                .Select(v => new
                {
                    v.Id,
                    Visible = v.IsActive && v.Product.IsActive && v.Product.Category.IsActive,
                    v.Availability,
                    v.RetailPrice,
                    Addons = v.Product.AllowedValues
                        .Where(a => a.AttributeValue.Attribute.IsAddon && a.AttributeValue.AddonPrice != null)
                        .Select(a => new AddonPriceDto(a.AttributeValueId, a.AttributeValue.AddonPrice!.Value))
                        .ToList(),
                })
                .ToListAsync(ct);
            return rows.Select(v => new VariantStatusDto(v.Id, v.Visible, v.Availability, v.Visible ? v.RetailPrice : null, v.Visible ? v.Addons : [])).ToList();
        });

        api.MapGet("/settings/public", async (AppDbContext db, CancellationToken ct) =>
        {
            var settings = await db.Settings.ToDictionaryAsync(s => s.Key, s => s.Value, ct);
            return new PublicSettingsDto(
                settings.GetValueOrDefault(SettingKeys.WhatsappNumber, ""),
                settings.GetValueOrDefault(SettingKeys.MercadoPagoAlias, ""));
        });
    }

    static ProductDetailDto ToDetail(Product p, ProductStatsDto stats, List<PublicReviewDto> reviews)
    {
        var allowed = p.AllowedValues.Select(a => a.AttributeValue).ToList();
        var addons = p.Category.Attributes
            .Where(ca => ca.Attribute.IsAddon)
            .OrderBy(ca => ca.SortOrder)
            .SelectMany(ca => allowed.Where(v => v.AttributeId == ca.AttributeId && v.AddonPrice != null).OrderBy(v => v.SortOrder))
            .Select(v => new AddonDto(v.Id, v.Label, v.AddonPrice!.Value))
            .ToList();
        var attributes = p.Category.Attributes
            .Where(ca => !ca.Attribute.IsAddon)
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
                .Select(v => new VariantDto(v.Id, v.Sku, v.Values.Select(x => x.AttributeValueId).Order().ToList(), v.Availability, v.RetailPrice))
                .ToList(),
            p.Media.OrderBy(m => m.SortOrder)
                .Select(m => new MediaDto(m.Id, m.Type, m.Url, m.AttributeValueId))
                .ToList(),
            p.Intensity, p.Caffeine, p.Sweetness, p.FlavorNotes, stats, reviews, addons);
    }
}
