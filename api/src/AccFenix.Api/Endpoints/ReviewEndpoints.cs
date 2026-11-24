using System.Text.RegularExpressions;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

public record ReviewCreateRequest(int ProductId, int Rating, string? Comment);

public record ReviewableProductDto(int ProductId, string Name, string Slug, int? Rating, string? Comment);

public record ReviewOrderDto(int Number, List<ReviewableProductDto> Products);

public class ReviewCreateRequestValidator : AbstractValidator<ReviewCreateRequest>
{
    public ReviewCreateRequestValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.Rating).InclusiveBetween(Review.MinRating, Review.MaxRating);
        RuleFor(x => x.Comment).FreeText(Review.CommentMaxLength);
    }
}

/// <summary>
/// Verified reviews. The token travels in the query string because request logs record the path but not the query.
/// An unknown token and an order that is not paid answer the same 404.
/// </summary>
public static partial class ReviewEndpoints
{
    public const string RateLimit = "review";
    public const int PermitLimit = 20;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(10);

    [GeneratedRegex("^[0-9a-f]{32}$")]
    private static partial Regex TokenFormat();

    public static void MapReviewEndpoints(this IEndpointRouteBuilder app)
    {
        var reviews = app.MapGroup("/api/reviews").WithTags("Public").RequireRateLimiting(RateLimit);

        reviews.MapGet("/order", async (string? token, AppDbContext db, CancellationToken ct) =>
        {
            var order = await FindReviewable(db, token, ct);
            if (order is null) return Results.NotFound();

            var products = await ProductsOf(db, order.Id).ToListAsync(ct);
            var written = await db.Reviews.AsNoTracking().Where(r => r.OrderId == order.Id).ToDictionaryAsync(r => r.ProductId, ct);
            return Results.Ok(new ReviewOrderDto(order.Number, products
                .OrderBy(p => p.Name)
                .Select(p => new ReviewableProductDto(p.Id, p.Name, p.Slug, written.GetValueOrDefault(p.Id)?.Rating, written.GetValueOrDefault(p.Id)?.Comment))
                .ToList()));
        });

        reviews.MapPost("", async (string? token, ReviewCreateRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var order = await FindReviewable(db, token, ct);
            if (order is null) return Results.NotFound();
            if (!await db.OrderItems.AnyAsync(i => i.OrderId == order.Id && i.Variant!.ProductId == req.ProductId, ct)) return Results.NotFound();
            if (await db.Reviews.AnyAsync(r => r.OrderId == order.Id && r.ProductId == req.ProductId, ct))
            {
                return ValidationExtensions.Conflict("Ya dejaste una reseña de este producto");
            }

            db.Reviews.Add(new Review
            {
                OrderId = order.Id,
                ProductId = req.ProductId,
                Rating = req.Rating,
                Comment = string.IsNullOrWhiteSpace(req.Comment) ? null : req.Comment.Trim(),
                AuthorName = FirstName(order.CustomerName),
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(ct);
            return Results.Created((string?)null, new { req.ProductId, req.Rating });
        })
        .Validate<ReviewCreateRequest>()
        .AddEndpointFilter<UniqueViolationFilter>();
    }

    static async Task<ReviewableOrder?> FindReviewable(AppDbContext db, string? token, CancellationToken ct)
    {
        if (token is null || !TokenFormat().IsMatch(token)) return null;
        return await db.Orders.AsNoTracking()
            .Where(o => o.ReviewToken == token && o.PaymentStatus == PaymentStatus.Approved && o.Status != OrderStatus.Cancelled)
            .Select(o => new ReviewableOrder(o.Id, o.Number, o.CustomerName))
            .FirstOrDefaultAsync(ct);
    }

    static IQueryable<OrderProduct> ProductsOf(AppDbContext db, int orderId) =>
        db.OrderItems
            .Where(i => i.OrderId == orderId && i.VariantId != null)
            .Select(i => new OrderProduct(i.Variant!.ProductId, i.Variant.Product.Name, i.Variant.Product.Slug))
            .Distinct();

    static string FirstName(string customerName)
    {
        var first = customerName.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "Cliente";
        return first.Length <= Review.AuthorMaxLength ? first : first[..Review.AuthorMaxLength];
    }

    sealed record ReviewableOrder(int Id, int Number, string CustomerName);

    sealed record OrderProduct(int Id, string Name, string Slug);
}
