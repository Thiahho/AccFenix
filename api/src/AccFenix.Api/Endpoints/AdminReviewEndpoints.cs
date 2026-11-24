using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

// ---- Requests ----
/// <summary>A review the admin registers for a customer. Without an author, the customer's first name is used.</summary>
public record AdminReviewCreateRequest(int OrderNumber, int ProductId, int Rating, string? Comment, string? AuthorName);

// ---- Responses ----
public record AdminReviewDto(
    int Id, int ProductId, string ProductName, string ProductSlug, int OrderNumber,
    int Rating, string? Comment, string AuthorName, DateTime CreatedAt);

/// <summary>A paid order as seen when registering a review: its products and the default author.</summary>
public record AdminReviewOrderDto(int Number, string CustomerName, string AuthorName, List<ReviewableProductDto> Products);

// ---- Validators ----
public class AdminReviewCreateRequestValidator : AbstractValidator<AdminReviewCreateRequest>
{
    public AdminReviewCreateRequestValidator()
    {
        RuleFor(x => x.OrderNumber).GreaterThan(0);
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.Rating).InclusiveBetween(Review.MinRating, Review.MaxRating);
        RuleFor(x => x.Comment).FreeText(Review.CommentMaxLength);
        RuleFor(x => x.AuthorName)
            .Must(ReviewRules.IsFirstNameOnly)
            .When(x => x.AuthorName is not null)
            .WithMessage($"Solo el nombre, sin apellido: una palabra de hasta {Review.AuthorMaxLength} caracteres");
    }
}

/// <summary>
/// Reviews from the admin panel. A registered review follows the same rules as the customer's own
/// (see <see cref="ReviewRules"/>), so "verified purchases" stays true.
/// </summary>
public static class AdminReviewEndpoints
{
    public static RouteGroupBuilder MapAdminReviewEndpoints(this RouteGroupBuilder admin)
    {
        // Newest first.
        admin.MapGet("/reviews", async (AppDbContext db, CancellationToken ct) =>
            Results.Ok(await db.Reviews.AsNoTracking()
                .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
                .Select(r => new AdminReviewDto(
                    r.Id, r.ProductId, r.Product.Name, r.Product.Slug, r.Order.Number,
                    r.Rating, r.Comment, r.AuthorName, r.CreatedAt))
                .ToListAsync(ct)));

        admin.MapGet("/reviews/order/{number:int}", async (int number, AppDbContext db, CancellationToken ct) =>
        {
            var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Number == number, ct);
            if (order is null) return OrderNotFound(number);
            if (!ReviewRules.CanReview(order)) return NotReviewable(order);

            var products = await ReviewRules.ProductsOf(db, order.Id, ct);
            return Results.Ok(new AdminReviewOrderDto(
                order.Number, order.CustomerName, ReviewRules.FirstName(order.CustomerName),
                products.Select(ReviewEndpoints.ToDto).ToList()));
        });

        admin.MapPost("/reviews", async (AdminReviewCreateRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Number == req.OrderNumber, ct);
            if (order is null) return OrderNotFound(req.OrderNumber);
            if (!ReviewRules.CanReview(order)) return NotReviewable(order);

            var author = req.AuthorName ?? ReviewRules.FirstName(order.CustomerName);
            var (result, review) = await ReviewRules.Add(db, order.Id, req.ProductId, req.Rating, req.Comment, author, ct);
            return result switch
            {
                AddReviewResult.ProductNotInOrder => Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["productId"] = [$"El producto no está en el pedido #{order.Number}"],
                }),
                AddReviewResult.AlreadyReviewed => ValidationExtensions.Conflict($"Ese producto ya tiene una reseña en el pedido #{order.Number}"),
                _ => Results.Created($"/api/admin/reviews/{review!.Id}", new { review.Id }),
            };
        }).Validate<AdminReviewCreateRequest>();

        admin.MapDelete("/reviews/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
            await db.Reviews.Where(r => r.Id == id).ExecuteDeleteAsync(ct) == 0 ? Results.NotFound() : Results.NoContent());

        return admin;
    }

    static IResult OrderNotFound(int number) =>
        Results.Problem($"No existe el pedido #{number}", statusCode: StatusCodes.Status404NotFound, title: "No encontrado");

    static IResult NotReviewable(Order order) => Results.ValidationProblem(new Dictionary<string, string[]>
    {
        ["orderNumber"] = [order.Status == OrderStatus.Cancelled
            ? $"El pedido #{order.Number} está cancelado"
            : $"El pedido #{order.Number} no tiene un pago aprobado"],
    });
}
