using AccFenix.Api.Seed;
using AccFenix.Api.Services;
using FluentValidation;

namespace AccFenix.Api.Endpoints;

public record DevAdminRequest(string Email, string Password);

public class DevAdminRequestValidator : AbstractValidator<DevAdminRequest>
{
    public DevAdminRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200).SingleLine();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(AdminAccountService.MinPasswordLength).MaximumLength(200);
    }
}

/// <summary>Local tooling. Unauthenticated, so Program.cs maps it only in the Development environment.</summary>
public static class DevEndpoints
{
    public static void MapDevEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/dev/admin", async (DevAdminRequest req, AdminAccountService admins, CancellationToken ct) =>
        {
            var created = await admins.CreateIfMissingAsync(req.Email, req.Password, ct);
            var email = AdminAccountService.NormalizeEmail(req.Email);
            return created
                ? Results.Created((string?)null, new { email })
                : Results.Problem("Ya existe un admin con ese email", statusCode: StatusCodes.Status409Conflict);
        })
        .Validate<DevAdminRequest>()
        .AddEndpointFilter<UniqueViolationFilter>()
        .WithTags("Dev");
    }
}
