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
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200).SingleLine();
        RuleFor(x => x.Password).NotEmpty().MaximumLength(200);
    }
}

public static class AuthEndpoints
{
    public const string LoginRateLimit = "login";

    static readonly PasswordHasher<AdminUser> Hasher = new();
    static readonly AdminUser NoUser = new() { Email = "" };
    static readonly string NoUserHash = Hasher.HashPassword(NoUser, Guid.NewGuid().ToString());

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/login", async (LoginRequest req, AppDbContext db, TokenService tokens, LoginThrottle throttle, CancellationToken ct) =>
        {
            var email = req.Email.Trim().ToLowerInvariant();
            // Same answer as the per-visitor rate limit; applies to unknown emails too, so it reveals nothing.
            if (throttle.IsLocked(email))
            {
                return Results.Problem("Demasiados intentos. Probá de nuevo más tarde.", statusCode: StatusCodes.Status429TooManyRequests);
            }

            var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == email, ct);
            // Si el email no existe se verifica igual contra un hash fijo, para que la respuesta tarde lo mismo.
            var verified = Hasher.VerifyHashedPassword(user ?? NoUser, user?.PasswordHash ?? NoUserHash, req.Password);
            if (user is null || verified == PasswordVerificationResult.Failed)
            {
                throttle.RecordFailure(email);
                return Results.Problem("Email o contraseña incorrectos", statusCode: StatusCodes.Status401Unauthorized);
            }
            throttle.RecordSuccess(email);
            return Results.Ok(tokens.Create(user));
        })
        .Validate<LoginRequest>()
        .RequireRateLimiting(LoginRateLimit)
        .WithTags("Auth");
    }
}
