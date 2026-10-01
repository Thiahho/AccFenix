using AccFenix.Api.Services;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AccFenix.Api.Endpoints;

/// <summary>Valida el body con FluentValidation y devuelve 400 ValidationProblem si falla.</summary>
public class ValidationFilter<T> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var validator = ctx.HttpContext.RequestServices.GetService<IValidator<T>>();
        var arg = ctx.Arguments.OfType<T>().FirstOrDefault();
        if (validator is not null && arg is not null)
        {
            var result = await validator.ValidateAsync(arg, ctx.HttpContext.RequestAborted);
            if (!result.IsValid) return Results.ValidationProblem(result.ToDictionary());
        }
        return await next(ctx);
    }
}

/// <summary>
/// Dos pedidos simultáneos pueden pasar el chequeo de duplicados y chocar en el índice único:
/// responde 409 en vez de 500.
/// </summary>
public class UniqueViolationFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        try
        {
            return await next(ctx);
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return ValidationExtensions.Conflict("Ya existe un registro con ese nombre o slug");
        }
    }
}

public static class ValidationExtensions
{
    public const int MaxSortOrder = 100_000;

    public static RouteHandlerBuilder Validate<T>(this RouteHandlerBuilder builder) => builder.AddEndpointFilter<ValidationFilter<T>>();

    public static IResult Conflict(string detail) =>
        Results.Problem(detail, statusCode: StatusCodes.Status409Conflict, title: "Conflicto");

    /// <summary>Texto de una sola línea: sin saltos ni otros caracteres de control.</summary>
    public static IRuleBuilderOptions<T, string> SingleLine<T>(this IRuleBuilder<T, string> rule) =>
        rule.Must(s => s is null || !s.Any(char.IsControl)).WithMessage("No puede tener saltos de línea ni caracteres de control");

    /// <summary>Texto libre (admite saltos de línea), sin el carácter nulo que Postgres rechaza.</summary>
    public static IRuleBuilderOptions<T, string?> FreeText<T>(this IRuleBuilder<T, string?> rule, int max) =>
        rule.MaximumLength(max).Must(s => s is null || !s.Contains('\0')).WithMessage("Contiene caracteres no válidos");

    /// <summary>El slug (o el nombre, si no se indica slug) debe dejar al menos una letra o número.</summary>
    public static IRuleBuilderOptions<T, string> ProducesSlug<T>(this IRuleBuilder<T, string> rule, Func<T, string?> slug) =>
        rule.Must((req, name) => Slug.From(string.IsNullOrWhiteSpace(slug(req)) ? name ?? "" : slug(req)!).Length > 0)
            .WithMessage("Debe tener al menos una letra o un número");

    public static IRuleBuilderOptions<T, int> ValidSortOrder<T>(this IRuleBuilder<T, int> rule) =>
        rule.InclusiveBetween(-MaxSortOrder, MaxSortOrder);

    /// <summary>Lista de ids obligatoria, acotada y solo con ids positivos.</summary>
    public static IRuleBuilderOptions<T, List<int>> IdList<T>(this IRuleBuilder<T, List<int>> rule, int max) =>
        rule.NotNull()
            .Must(ids => ids is null || (ids.Count <= max && ids.All(id => id > 0)))
            .WithMessage($"Hasta {max} ids, todos mayores que cero");
}
