using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;

namespace AccFenix.Api.Services;

/// <summary>
/// Identifica al visitante para el límite de intentos de login. La web hace el login desde su servidor, así que
/// la API siempre ve la IP de la web: la web reenvía la IP del visitante y la API la acepta solo si viene con la
/// clave compartida (TrustedWeb:Key). Sin clave válida se usa la IP de la conexión.
/// </summary>
public static class ClientIp
{
    public const string IpHeader = "X-Client-Ip";
    public const string KeyHeader = "X-Trusted-Web-Key";

    public static string PartitionKey(HttpContext ctx, string trustedKey)
    {
        var headers = ctx.Request.Headers;
        if (trustedKey.Length > 0
            && FixedTimeEquals(headers[KeyHeader].ToString(), trustedKey)
            && IPAddress.TryParse(headers[IpHeader].ToString(), out var ip))
        {
            return $"web:{Normalize(ip)}";
        }
        return $"direct:{ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
    }

    /// <summary>En IPv6 un mismo visitante dispone de todo un /64: se cuenta por prefijo.</summary>
    static string Normalize(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        if (ip.AddressFamily != AddressFamily.InterNetworkV6) return ip.ToString();
        var bytes = ip.GetAddressBytes();
        Array.Clear(bytes, 8, 8);
        return $"{new IPAddress(bytes)}/64";
    }

    static bool FixedTimeEquals(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}
