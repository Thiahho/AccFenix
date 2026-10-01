using AccFenix.Api.Domain;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;

namespace AccFenix.Api.Services;

public class CloudinaryOptions
{
    public string CloudName { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string ApiSecret { get; set; } = "";
    public string Folder { get; set; } = "accfenix";

    public bool IsConfigured => CloudName.Length > 0 && ApiKey.Length > 0 && ApiSecret.Length > 0;
}

/// <summary>Firma para que el navegador suba el archivo directo a Cloudinary sin pasar por la API.</summary>
public record UploadSignature(string CloudName, string ApiKey, long Timestamp, string Folder, string Signature);

public interface IMediaStorage
{
    bool IsConfigured { get; }
    UploadSignature SignUpload();
    Task DeleteAsync(string publicId, MediaType type, CancellationToken ct);
    /// <summary>true si la URL pertenece a nuestra cuenta de Cloudinary (evita registrar URLs arbitrarias).</summary>
    bool IsOwnUrl(string url);
}

public static class MediaUrl
{
    /// <summary>
    /// true si la URL de entrega (…/upload/v123/{publicId}.ext) es la de ese publicId. Evita registrar un
    /// publicId que no corresponde al archivo: es el que se usa después para borrarlo de Cloudinary.
    /// </summary>
    public static bool HasPublicId(string url, string publicId)
    {
        const string marker = "/upload/";
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || publicId.Length == 0) return false;
        var path = Uri.UnescapeDataString(uri.AbsolutePath);
        var start = path.IndexOf(marker, StringComparison.Ordinal);
        if (start < 0) return false;
        path = path[(start + marker.Length)..];

        // Versión opcional: "v1712345678/".
        var slash = path.IndexOf('/');
        if (slash > 1 && path[0] == 'v' && path[1..slash].All(char.IsAsciiDigit)) path = path[(slash + 1)..];

        var dot = path.LastIndexOf('.');
        if (dot > path.LastIndexOf('/')) path = path[..dot];
        return path == publicId;
    }
}

public class CloudinaryMediaStorage(IOptions<CloudinaryOptions> options, ILogger<CloudinaryMediaStorage> logger) : IMediaStorage
{
    readonly CloudinaryOptions _o = options.Value;

    public bool IsConfigured => _o.IsConfigured;

    Cloudinary Client() => new(new Account(_o.CloudName, _o.ApiKey, _o.ApiSecret));

    public UploadSignature SignUpload()
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var parameters = new SortedDictionary<string, object> { ["folder"] = _o.Folder, ["timestamp"] = timestamp };
        var signature = Client().Api.SignParameters(parameters);
        return new UploadSignature(_o.CloudName, _o.ApiKey, timestamp, _o.Folder, signature);
    }

    public async Task DeleteAsync(string publicId, MediaType type, CancellationToken ct)
    {
        if (!IsConfigured) return;
        var result = await Client().DestroyAsync(new DeletionParams(publicId)
        {
            ResourceType = type == MediaType.Video ? ResourceType.Video : ResourceType.Image,
        });
        if (result.Error is not null)
        {
            // No bloquea el borrado en la base: a lo sumo queda un archivo huérfano en Cloudinary.
            logger.LogWarning("No se pudo borrar {PublicId} de Cloudinary: {Error}", publicId, result.Error.Message);
        }
    }

    public bool IsOwnUrl(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps
        && uri.Host == "res.cloudinary.com"
        && uri.AbsolutePath.StartsWith($"/{_o.CloudName}/", StringComparison.Ordinal);
}
