using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

public record MediaCreateRequest(string Url, string PublicId, MediaType Type, int? AttributeValueId);
public record MediaPatchRequest(int? SortOrder, int? AttributeValueId, bool ClearAttributeValue = false);

public class MediaCreateRequestValidator : AbstractValidator<MediaCreateRequest>
{
    public MediaCreateRequestValidator()
    {
        RuleFor(x => x.Url).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.PublicId).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Type).IsInEnum();
    }
}

public static class AdminMediaEndpoints
{
    public static RouteGroupBuilder MapAdminMediaEndpoints(this RouteGroupBuilder admin)
    {
        admin.MapPost("/media/signature", (IMediaStorage storage) =>
            storage.IsConfigured
                ? Results.Ok(storage.SignUpload())
                : Results.Problem("Cloudinary no está configurado en la API", statusCode: StatusCodes.Status503ServiceUnavailable));

        admin.MapPost("/products/{id:int}/media", async (int id, MediaCreateRequest req, AppDbContext db, IMediaStorage storage, CancellationToken ct) =>
        {
            if (!await db.Products.AnyAsync(p => p.Id == id, ct)) return Results.NotFound();
            if (!storage.IsOwnUrl(req.Url))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["url"] = ["La URL no pertenece a la cuenta de Cloudinary configurada"] });
            }
            if (req.AttributeValueId is { } valueId && !await db.ProductAllowedValues.AnyAsync(a => a.ProductId == id && a.AttributeValueId == valueId, ct))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["attributeValueId"] = ["El valor no está habilitado en el producto"] });
            }

            var nextOrder = await db.Media.Where(m => m.ProductId == id).Select(m => (int?)m.SortOrder).MaxAsync(ct) ?? -1;
            var media = new Media
            {
                ProductId = id, Url = req.Url, CloudinaryPublicId = req.PublicId, Type = req.Type,
                AttributeValueId = req.AttributeValueId, SortOrder = nextOrder + 1,
            };
            db.Media.Add(media);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/media/{media.Id}", new AdminMediaDto(media.Id, media.Type, media.Url, media.AttributeValueId, media.SortOrder));
        }).Validate<MediaCreateRequest>();

        admin.MapPatch("/media/{id:int}", async (int id, MediaPatchRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var media = await db.Media.FindAsync([id], ct);
            if (media is null) return Results.NotFound();
            if (!req.ClearAttributeValue && req.AttributeValueId is { } newValueId
                && !await db.ProductAllowedValues.AnyAsync(a => a.ProductId == media.ProductId && a.AttributeValueId == newValueId, ct))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["attributeValueId"] = ["El valor no está habilitado en el producto"] });
            }
            if (req.SortOrder is { } order) media.SortOrder = order;
            if (req.ClearAttributeValue) media.AttributeValueId = null;
            else if (req.AttributeValueId is { } valueId) media.AttributeValueId = valueId;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        admin.MapDelete("/media/{id:int}", async (int id, AppDbContext db, IMediaStorage storage, CancellationToken ct) =>
        {
            var media = await db.Media.FindAsync([id], ct);
            if (media is null) return Results.NotFound();
            if (media.CloudinaryPublicId is not null) await storage.DeleteAsync(media.CloudinaryPublicId, media.Type, ct);
            db.Media.Remove(media);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        return admin;
    }
}
