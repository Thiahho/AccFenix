using System.Text.RegularExpressions;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
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

            var products = await ReviewRules.ProductsOf(db, order.Id, ct);
            return Results.Ok(new ReviewOrderDto(order.Number, products.Select(ToDto).ToList()));
        });

        reviews.MapPost("", async (string? token, ReviewCreateRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var order = await FindReviewable(db, token, ct);
            if (order is null) return Results.NotFound();

            var (result, _) = await ReviewRules.Add(db, order.Id, req.ProductId, req.Rating, req.Comment, ReviewRules.FirstName(order.CustomerName), ct);
            return result switch
            {
                AddReviewResult.ProductNotInOrder => Results.NotFound(),
                AddReviewResult.AlreadyReviewed => ValidationExtensions.Conflict("Ya dejaste una reseña de este producto"),
                _ => Results.Created((string?)null, new { req.ProductId, req.Rating }),
            };
        })
        .Validate<ReviewCreateRequest>()
        .AddEndpointFilter<UniqueViolationFilter>();
    }

    internal static ReviewableProductDto ToDto(OrderProductReview p) => new(p.ProductId, p.Name, p.Slug, p.Rating, p.Comment);

    static async Task<ReviewableOrder?> FindReviewable(AppDbContext db, string? token, CancellationToken ct)
    {
        if (token is null || !TokenFormat().IsMatch(token)) return null;
        return await db.Orders.AsNoTracking()
            .Where(o => o.ReviewToken == token)
            .Where(ReviewRules.IsReviewable)
            .Select(o => new ReviewableOrder(o.Id, o.Number, o.CustomerName))
            .FirstOrDefaultAsync(ct);
    }

    sealed record ReviewableOrder(int Id, int Number, string CustomerName);
}
