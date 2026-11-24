namespace AccFenix.Api.Domain;

/// <summary>Where the customer sent the message shown in a testimonial screenshot.</summary>
public enum TestimonialSource
{
    Instagram = 0,
    WhatsApp = 1,
    Other = 2,
}

/// <summary>
/// A screenshot of a customer message (Instagram, WhatsApp...) uploaded by the admin and shown on the home page.
/// It is not a verified review: it is not tied to an order or a product.
/// </summary>
public class Testimonial
{
    public const int CaptionMaxLength = 140;
    public const int MaxDimension = 20_000;
    /// <summary>How many published screenshots the public gallery shows at most.</summary>
    public const int MaxPublic = 24;

    public int Id { get; set; }
    public required string Url { get; set; }
    public string? CloudinaryPublicId { get; set; }
    public TestimonialSource Source { get; set; }
    /// <summary>Short text shown as the image's alt text. Public.</summary>
    public string? Caption { get; set; }
    /// <summary>Pixel size reported by Cloudinary, so the gallery reserves the space before the image loads.</summary>
    public int Width { get; set; }
    public int Height { get; set; }
    public bool IsPublished { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}
