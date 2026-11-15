using Microsoft.Extensions.Caching.Memory;

namespace AccFenix.Api.Services;

/// <summary>
/// Per-account login backoff, on top of the per-visitor rate limit: after <see cref="MaxFailures"/> failed
/// attempts for the same email within <see cref="Window"/>, that email is locked for <see cref="Lockout"/>,
/// whatever address the attempts come from. A successful login clears the count.
/// </summary>
/// <remarks>
/// Kept in memory: the API runs as a single instance. Unknown emails are counted exactly like real ones,
/// so the lockout does not reveal which accounts exist.
/// </remarks>
public sealed class LoginThrottle : IDisposable
{
    public const int MaxFailures = 5;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan Lockout = TimeSpan.FromMinutes(15);

    /// <summary>Bounds the memory an attacker can make the throttle use by trying many different emails.</summary>
    const int MaxTrackedEmails = 10_000;

    readonly MemoryCache _entries = new(new MemoryCacheOptions { SizeLimit = MaxTrackedEmails });
    readonly TimeProvider _time;

    public LoginThrottle(TimeProvider? time = null) => _time = time ?? TimeProvider.System;

    sealed class Entry
    {
        public int Failures;
        public DateTimeOffset WindowStart;
        public DateTimeOffset? LockedUntil;
    }

    /// <summary>true while the email is locked out.</summary>
    public bool IsLocked(string email)
    {
        if (!_entries.TryGetValue(email, out Entry? entry) || entry is null) return false;
        lock (entry) return entry.LockedUntil is { } until && until > _time.GetUtcNow();
    }

    public void RecordFailure(string email)
    {
        var now = _time.GetUtcNow();
        var entry = _entries.GetOrCreate(email, e =>
        {
            e.Size = 1;
            e.AbsoluteExpirationRelativeToNow = Window;
            return new Entry { WindowStart = now };
        })!;

        lock (entry)
        {
            if (now - entry.WindowStart > Window)
            {
                entry.Failures = 0;
                entry.WindowStart = now;
            }
            entry.Failures++;
            if (entry.Failures >= MaxFailures)
            {
                entry.LockedUntil = now + Lockout;
                entry.Failures = 0;
                entry.WindowStart = now;
            }

            // Keep the entry for as long as it still matters: the rest of its window or of its lockout.
            var windowEnd = entry.WindowStart + Window;
            var expires = entry.LockedUntil is { } until && until > windowEnd ? until : windowEnd;
            _entries.Set(email, entry, new MemoryCacheEntryOptions { Size = 1, AbsoluteExpiration = expires });
        }
    }

    public void RecordSuccess(string email) => _entries.Remove(email);

    public void Dispose() => _entries.Dispose();
}
