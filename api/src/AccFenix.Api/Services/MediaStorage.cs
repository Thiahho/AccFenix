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

/// <summary>
/// Firma para que el navegador suba el archivo directo a Cloudinary sin pasar por la API. The browser must send
/// <c>folder</c>, <c>timestamp</c> and <c>allowed_formats</c> exactly as given: they are all signed, so Cloudinary
/// rejects an upload that changes them. The size limits are not upload parameters of Cloudinary (its own account
/// limits apply on the server); the browser checks them before uploading.
/// </summary>
public record UploadSignature(
    string CloudName, string ApiKey, long Timestamp, string Folder, string AllowedFormats, string Signature,
    long MaxImageBytes, long MaxVideoBytes);

/// <summary>What the admin may upload as product media.</summary>
public static class MediaUploadRules
{
    public static readonly string[] ImageFormats = ["jpg", "jpeg", "png", "webp", "avif"];
    public static readonly string[] VideoFormats = ["mp4", "webm", "mov"];
    public static readonly string AllowedFormats = string.Join(',', ImageFormats.Concat(VideoFormats));

    public const long MaxImageBytes = 10L * 1024 * 1024;
    public const long MaxVideoBytes = 100L * 1024 * 1024;
}

public interface IMediaStorage
{
    bool IsConfigured { get; }
    UploadSignature SignUpload();
    Task DeleteAsync(string publicId, MediaType type, CancellationToken ct);
    /// <summary>true si la URL pertenece a nuestra cuenta de Cloudinary (evita registrar URLs arbitrarias).</summary>
    bool IsOwnUrl(string url);
}

public static class MediaStorageExtensions
{
    /// <summary>
    /// Removes the files of media rows that are already deleted from the database. Best effort: a storage
    /// failure is logged and leaves at most an orphan file; it never fails the request that already committed.
    /// Deletes run a few at a time and each one is given at most <paramref name="timeout"/> (10 s by default), so a
    /// slow or unreachable Cloudinary cannot hold the response for long.
    /// </summary>
    public static async Task DeleteBestEffortAsync(
        this IMediaStorage storage, IEnumerable<Media> media, ILogger logger, TimeSpan? timeout = null)
    {
        var perCall = timeout ?? DefaultDeleteTimeout;
        var items = media.Where(m => m.CloudinaryPublicId is not null).ToList();

        // Not tied to the request: the rows are gone, so the files should go even if the client left.
        await Parallel.ForEachAsync(items, new ParallelOptions { MaxDegreeOfParallelism = MaxParallelDeletes }, async (item, _) =>
        {
            using var cts = new CancellationTokenSource(perCall);
            try
            {
                // WaitAsync bounds the wait even when the storage ignores the token.
                await storage.DeleteAsync(item.CloudinaryPublicId!, item.Type, cts.Token).WaitAsync(cts.Token);
            }
            catch (OperationCanceledException) when (cts.IsCancellationRequested)
            {
                logger.LogWarning("Borrar {PublicId} de Cloudinary tardó más de {Timeout}; queda un archivo huérfano",
                    item.CloudinaryPublicId, perCall);
            }
            catch (Exception e)
            {
                logger.LogWarning(e, "No se pudo borrar {PublicId} de Cloudinary; queda un archivo huérfano", item.CloudinaryPublicId);
            }
        });
    }

    public static readonly TimeSpan DefaultDeleteTimeout = TimeSpan.FromSeconds(10);
    const int MaxParallelDeletes = 4;
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

    Cloudinary Client()
    {
        var client = new Cloudinary(new Account(_o.CloudName, _o.ApiKey, _o.ApiSecret));
        // DestroyAsync takes no CancellationToken, so the HTTP call itself is bounded by the SDK timeout (ms).
        client.Api.Timeout = (int)MediaStorageExtensions.DefaultDeleteTimeout.TotalMilliseconds;
        return client;
    }

    public UploadSignature SignUpload()
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var parameters = new SortedDictionary<string, object>
        {
            ["allowed_formats"] = MediaUploadRules.AllowedFormats,
            ["folder"] = _o.Folder,
            ["timestamp"] = timestamp,
        };
        var signature = Client().Api.SignParameters(parameters);
        return new UploadSignature(_o.CloudName, _o.ApiKey, timestamp, _o.Folder, MediaUploadRules.AllowedFormats, signature,
            MediaUploadRules.MaxImageBytes, MediaUploadRules.MaxVideoBytes);
    }

    public async Task DeleteAsync(string publicId, MediaType type, CancellationToken ct)
    {
        if (!IsConfigured) return;
        // The SDK has no token overload for DestroyAsync; WaitAsync stops waiting when the caller gives up.
        var result = await Client().DestroyAsync(new DeletionParams(publicId)
        {
            ResourceType = type == MediaType.Video ? ResourceType.Video : ResourceType.Image,
        }).WaitAsync(ct);
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
