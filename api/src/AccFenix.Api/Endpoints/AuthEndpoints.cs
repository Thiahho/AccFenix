using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

public record LoginRequest(string Email, string Password);

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public static class AuthEndpoints
{
    public const string LoginRateLimit = "login";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/login", async (LoginRequest req, AppDbContext db, TokenService tokens, CancellationToken ct) =>
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == email, ct);
            var hasher = new PasswordHasher<AdminUser>();
            if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password) == PasswordVerificationResult.Failed)
            {
                return Results.Problem("Email o contraseña incorrectos", statusCode: StatusCodes.Status401Unauthorized);
            }
            return Results.Ok(tokens.Create(user));
        })
        .Validate<LoginRequest>()
        .RequireRateLimiting(LoginRateLimit)
        .WithTags("Auth");
    }
}
