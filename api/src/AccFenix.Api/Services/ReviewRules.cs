using System.Linq.Expressions;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Services;

/// <summary>A product of an order, with the review it already has (if any).</summary>
public sealed record OrderProductReview(int ProductId, string Name, string Slug, int? Rating, string? Comment);

public enum AddReviewResult
{
    Added,
    ProductNotInOrder,
    AlreadyReviewed,
}

/// <summary>
/// Rules every review follows, whoever writes it (the customer through the order's link or the admin):
/// only paid orders that were not cancelled, only products of that order, one review per product and order,
/// and a public author that is a first name only.
/// </summary>
public static class ReviewRules
{
    /// <summary>The order was paid (approved payment) and not cancelled.</summary>
    public static readonly Expression<Func<Order, bool>> IsReviewable =
        o => o.PaymentStatus == PaymentStatus.Approved && o.Status != OrderStatus.Cancelled;

    static readonly Func<Order, bool> IsReviewableCompiled = IsReviewable.Compile();

    public static bool CanReview(Order order) => IsReviewableCompiled(order);

    /// <summary>The distinct catalog products of an order, by name, each with the review it already has.</summary>
    public static async Task<List<OrderProductReview>> ProductsOf(AppDbContext db, int orderId, CancellationToken ct)
    {
        var products = await db.OrderItems
            .Where(i => i.OrderId == orderId && i.VariantId != null)
            .Select(i => new { i.Variant!.ProductId, i.Variant.Product.Name, i.Variant.Product.Slug })
            .Distinct()
            .ToListAsync(ct);
        var written = await db.Reviews.AsNoTracking().Where(r => r.OrderId == orderId).ToDictionaryAsync(r => r.ProductId, ct);
        return products
            .OrderBy(p => p.Name)
            .Select(p => new OrderProductReview(p.ProductId, p.Name, p.Slug, written.GetValueOrDefault(p.ProductId)?.Rating, written.GetValueOrDefault(p.ProductId)?.Comment))
            .ToList();
    }

    /// <summary>
    /// Adds the review when the product belongs to the order and has no review for it yet.
    /// The caller has already checked that the order is reviewable and validated the rating, comment and author.
    /// </summary>
    public static async Task<(AddReviewResult Result, Review? Review)> Add(
        AppDbContext db, int orderId, int productId, int rating, string? comment, string authorName, CancellationToken ct)
    {
        if (!await db.OrderItems.AnyAsync(i => i.OrderId == orderId && i.Variant!.ProductId == productId, ct))
            return (AddReviewResult.ProductNotInOrder, null);
        if (await db.Reviews.AnyAsync(r => r.OrderId == orderId && r.ProductId == productId, ct))
            return (AddReviewResult.AlreadyReviewed, null);

        var review = new Review
        {
            OrderId = orderId,
            ProductId = productId,
            Rating = rating,
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
            AuthorName = NormalizeAuthorName(authorName),
            CreatedAt = DateTime.UtcNow,
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync(ct);
        return (AddReviewResult.Added, review);
    }

    /// <summary>The first word of the customer's name, cut to the author limit: the rest of the name is never public.</summary>
    public static string FirstName(string customerName)
    {
        var first = customerName.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "Cliente";
        return first.Length <= Review.AuthorMaxLength ? first : first[..Review.AuthorMaxLength];
    }

    /// <summary>A valid author is a single line within the author limit; compound first names such as "María José" are allowed.</summary>
    public static bool IsValidAuthorName(string? name)
    {
        if (name is null || name.Any(char.IsControl)) return false;
        var normalized = NormalizeAuthorName(name);
        return normalized.Length is > 0 and <= Review.AuthorMaxLength;
    }

    /// <summary>Trims the name and collapses repeated spaces between words.</summary>
    public static string NormalizeAuthorName(string name) =>
        string.Join(' ', name.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
}
