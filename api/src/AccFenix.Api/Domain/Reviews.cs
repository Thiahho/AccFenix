namespace AccFenix.Api.Domain;

/// <summary>A verified review: one per product of a paid order, written through that order's private link.</summary>
public class Review
{
    public const int MinRating = 1;
    public const int MaxRating = 5;
    public const int CommentMaxLength = 500;
    public const int AuthorMaxLength = 60;

    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int Rating { get; set; }
    public string? Comment { get; set; }
    /// <summary>First name only: this text is public.</summary>
    public required string AuthorName { get; set; }
    public DateTime CreatedAt { get; set; }
}
