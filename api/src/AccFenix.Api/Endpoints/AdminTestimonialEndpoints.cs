using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

// ---- Requests ----
/// <summary>A screenshot already uploaded to Cloudinary with the signature of <c>/media/signature</c>.</summary>
public record TestimonialCreateRequest(string Url, string PublicId, TestimonialSource Source, string? Caption, int Width, int Height);

/// <summary>Partial update: a missing field keeps its value; an empty caption clears it.</summary>
public record TestimonialPatchRequest(string? Caption, TestimonialSource? Source, bool? IsPublished, int? SortOrder);

// ---- Responses ----
public record AdminTestimonialDto(
    int Id, string Url, TestimonialSource Source, string? Caption, int Width, int Height,
    bool IsPublished, int SortOrder, DateTime CreatedAt);

// ---- Validators ----
public class TestimonialCreateRequestValidator : AbstractValidator<TestimonialCreateRequest>
{
    public TestimonialCreateRequestValidator()
    {
        RuleFor(x => x.Url).NotEmpty().MaximumLength(1000)
            .Must(TestimonialRules.IsImageUrl).WithMessage("La captura tiene que ser una imagen");
        RuleFor(x => x.PublicId).NotEmpty().MaximumLength(300)
            .Must((req, publicId) => MediaUrl.HasPublicId(req.Url ?? "", publicId ?? ""))
            .WithMessage("El publicId no corresponde a la URL");
        RuleFor(x => x.Source).IsInEnum();
        RuleFor(x => x.Caption).FreeText(Testimonial.CaptionMaxLength);
        RuleFor(x => x.Width).InclusiveBetween(1, Testimonial.MaxDimension);
        RuleFor(x => x.Height).InclusiveBetween(1, Testimonial.MaxDimension);
    }
}

public class TestimonialPatchRequestValidator : AbstractValidator<TestimonialPatchRequest>
{
    public TestimonialPatchRequestValidator()
    {
        RuleFor(x => x.Caption).FreeText(Testimonial.CaptionMaxLength);
        RuleFor(x => x.Source).IsInEnum();
        RuleFor(x => x.SortOrder).InclusiveBetween(-ValidationExtensions.MaxSortOrder, ValidationExtensions.MaxSortOrder);
    }
}

public static class TestimonialRules
{
    /// <summary>true when the URL is a Cloudinary image delivery URL with one of the allowed image formats.</summary>
    public static bool IsImageUrl(string? url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        var path = uri.AbsolutePath;
        var extension = Path.GetExtension(path).TrimStart('.').ToLowerInvariant();
        return path.Contains("/image/upload/", StringComparison.Ordinal) && MediaUploadRules.ImageFormats.Contains(extension);
    }

    /// <summary>A blank caption means "no caption".</summary>
    public static string? NormalizeCaption(string? caption) => string.IsNullOrWhiteSpace(caption) ? null : caption.Trim();
}

/// <summary>
/// Screenshots of customer messages for the home page. Uploads go straight from the browser to Cloudinary
/// with the shared <c>/media/signature</c>; these endpoints only register, edit and delete them.
/// </summary>
public static class AdminTestimonialEndpoints
{
    public static RouteGroupBuilder MapAdminTestimonialEndpoints(this RouteGroupBuilder admin)
    {
        admin.MapGet("/testimonials", async (AppDbContext db, CancellationToken ct) =>
            Results.Ok(await db.Testimonials.AsNoTracking()
                .OrderBy(t => t.SortOrder).ThenByDescending(t => t.Id)
                .Select(t => new AdminTestimonialDto(
                    t.Id, t.Url, t.Source, t.Caption, t.Width, t.Height, t.IsPublished, t.SortOrder, t.CreatedAt))
                .ToListAsync(ct)));

        // New screenshots start unpublished, at the end of the list.
        admin.MapPost("/testimonials", async (TestimonialCreateRequest req, AppDbContext db, IMediaStorage storage, CancellationToken ct) =>
        {
            if (!storage.IsOwnUrl(req.Url))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["url"] = ["La URL no pertenece a la cuenta de Cloudinary configurada"] });
            }

            var nextOrder = await db.Testimonials.Select(t => (int?)t.SortOrder).MaxAsync(ct) ?? -1;
            var testimonial = new Testimonial
            {
                Url = req.Url, CloudinaryPublicId = req.PublicId, Source = req.Source,
                Caption = TestimonialRules.NormalizeCaption(req.Caption), Width = req.Width, Height = req.Height,
                IsPublished = false, SortOrder = Math.Min(nextOrder + 1, ValidationExtensions.MaxSortOrder),
                CreatedAt = DateTime.UtcNow,
            };
            db.Testimonials.Add(testimonial);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/admin/testimonials/{testimonial.Id}", ToDto(testimonial));
        }).Validate<TestimonialCreateRequest>();

        admin.MapPatch("/testimonials/{id:int}", async (int id, TestimonialPatchRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var testimonial = await db.Testimonials.FindAsync([id], ct);
            if (testimonial is null) return Results.NotFound();
            if (req.Caption is not null) testimonial.Caption = TestimonialRules.NormalizeCaption(req.Caption);
            if (req.Source is { } source) testimonial.Source = source;
            if (req.IsPublished is { } published) testimonial.IsPublished = published;
            if (req.SortOrder is { } order) testimonial.SortOrder = order;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).Validate<TestimonialPatchRequest>();

        // The row goes first; the stored file is removed afterwards, best effort.
        admin.MapDelete("/testimonials/{id:int}", async (int id, AppDbContext db, IMediaStorage storage, ILogger<Testimonial> logger, CancellationToken ct) =>
        {
            var testimonial = await db.Testimonials.FindAsync([id], ct);
            if (testimonial is null) return Results.NotFound();
            db.Testimonials.Remove(testimonial);
            await db.SaveChangesAsync(ct);
            // The storage deletes by media file; this one is never saved, it only describes the stored image.
            await storage.DeleteBestEffortAsync(
                [new Media { Url = testimonial.Url, CloudinaryPublicId = testimonial.CloudinaryPublicId, Type = MediaType.Image }], logger);
            return Results.NoContent();
        });

        return admin;
    }

    static AdminTestimonialDto ToDto(Testimonial t) =>
        new(t.Id, t.Url, t.Source, t.Caption, t.Width, t.Height, t.IsPublished, t.SortOrder, t.CreatedAt);
}
