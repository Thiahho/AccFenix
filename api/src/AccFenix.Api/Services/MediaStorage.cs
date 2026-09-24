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
