using FluentValidation;

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

public static class ValidationExtensions
{
    public static RouteHandlerBuilder Validate<T>(this RouteHandlerBuilder builder) => builder.AddEndpointFilter<ValidationFilter<T>>();

    public static IResult Conflict(string detail) =>
        Results.Problem(detail, statusCode: StatusCodes.Status409Conflict, title: "Conflicto");
}
