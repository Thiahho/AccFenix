using System.Globalization;
using System.Text;

namespace AccFenix.Api.Services;

public static class Slug
{
    /// <summary>"Soporte Bocha 2.40" → "soporte-bocha-2-40". Quita acentos y deja solo [a-z0-9-].</summary>
    public static string From(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        var lastDash = true;
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            var c = char.ToLowerInvariant(ch);
            if (c is >= 'a' and <= 'z' or >= '0' and <= '9')
            {
                sb.Append(c);
                lastDash = false;
            }
            else if (!lastDash)
            {
                sb.Append('-');
                lastDash = true;
            }
        }
        return sb.ToString().TrimEnd('-');
    }

    /// <summary>true si el texto tiene la forma de un slug generado por <see cref="From"/>: [a-z0-9-], hasta 180 caracteres.</summary>
    public static bool IsValid(string? text) =>
        text is { Length: > 0 and <= 180 } && text.All(c => c is >= 'a' and <= 'z' or >= '0' and <= '9' or '-');
}
