using System.Security.Cryptography;
using System.Text;

namespace AccFenix.Api.Services;

/// <summary>Checks the <c>x-signature</c> header Mercado Pago adds to its webhooks.</summary>
public static class MercadoPagoSignature
{
    /// <summary>The signed text is <c>id:{data.id};request-id:{x-request-id};ts:{ts};</c>, with HMAC-SHA256 and the webhook secret.</summary>
    public static bool IsValid(string secret, string? signature, string? requestId, string? dataId)
    {
        if (string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(requestId) || string.IsNullOrEmpty(dataId)) return false;

        var parts = signature.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Where(pair => pair.Length == 2)
            .GroupBy(pair => pair[0])
            .ToDictionary(group => group.Key, group => group.First()[1]);
        if (!parts.TryGetValue("ts", out var ts) || !parts.TryGetValue("v1", out var received)) return false;

        var manifest = $"id:{dataId.ToLowerInvariant()};request-id:{requestId};ts:{ts};";
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(manifest));
        try
        {
            return CryptographicOperations.FixedTimeEquals(expected, Convert.FromHexString(received));
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
