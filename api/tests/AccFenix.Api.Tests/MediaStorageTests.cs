using System.Diagnostics;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace AccFenix.Api.Tests;

public class MediaStorageTests
{
    [Fact]
    public async Task Best_effort_delete_does_not_wait_past_the_timeout_for_a_hanging_storage()
    {
        var storage = new HangingMediaStorage();
        var media = Enumerable.Range(1, 8)
            .Select(i => new Media { Url = $"https://res.cloudinary.com/demo/image/upload/accfenix/{i}.jpg", CloudinaryPublicId = $"accfenix/{i}", Type = MediaType.Image })
            .ToList();

        var watch = Stopwatch.StartNew();
        var delete = storage.DeleteBestEffortAsync(media, NullLogger.Instance, TimeSpan.FromMilliseconds(200));

        // Eight deletes, four at a time, 200 ms each: about 400 ms. A hang would never finish.
        (await Task.WhenAny(delete, Task.Delay(TimeSpan.FromSeconds(10)))).Should().BeSameAs(delete);
        await delete;
        watch.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(5));
        storage.Calls.Should().Be(8);
    }

    /// <summary>A configured storage whose deletes never finish and ignore the cancellation token.</summary>
    sealed class HangingMediaStorage : IMediaStorage
    {
        int _calls;
        public int Calls => _calls;
        public bool IsConfigured => true;
        public UploadSignature SignUpload() => throw new NotSupportedException();
        public Task DeleteAsync(string publicId, MediaType type, CancellationToken ct)
        {
            Interlocked.Increment(ref _calls);
            return Task.Delay(Timeout.Infinite);
        }
        public bool IsOwnUrl(string url) => true;
    }
}
