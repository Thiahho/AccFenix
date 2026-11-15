using System.Collections.Concurrent;

namespace AccFenix.Api.Services;

/// <summary>
/// Login backoff on top of the per-visitor rate limit, with two counters per failed attempt:
/// <list type="bullet">
/// <item>Per (email, client) pair: after <see cref="MaxFailures"/> failures within <see cref="Window"/>, that client
/// is locked out of that email for <see cref="Lockout"/>. Other clients can still log in to it, so a single attacker
/// cannot keep the real admin out.</item>
/// <item>Per email, across all clients: after <see cref="MaxEmailFailures"/> failures within <see cref="Window"/>,
/// the email is locked for everyone for <see cref="Lockout"/>. This only stops distributed guessing.</item>
/// </list>
/// A successful login clears the pair and resets the email-wide counter.
/// </summary>
/// <remarks>
/// <para>
/// Why <see cref="MaxEmailFailures"/> is out of reach of a single client: once a pair is locked, its attempts are
/// refused before the password is checked and are not counted, so one client adds at most <see cref="MaxFailures"/>
/// (5) failures to an email per lockout. Even without that, the per-visitor rate limit (10 requests per 5-minute
/// fixed window) lets a client make at most 40 attempts in any 15-minute span (it can overlap 4 windows). 50 is
/// above both, so locking an email for everyone takes failures from at least 10 different clients.
/// </para>
/// <para>
/// Kept in memory: the API runs as a single instance, and a restart clears every lock. Unknown emails are counted
/// exactly like real ones, so the lockout does not reveal which accounts exist.
/// </para>
/// </remarks>
public sealed class LoginThrottle
{
    public const int MaxFailures = 5;
    public const int MaxEmailFailures = 50;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan Lockout = TimeSpan.FromMinutes(15);

    /// <summary>Bounds the memory an attacker can make the throttle use by trying many emails or addresses.</summary>
    public const int MaxTrackedKeys = 10_000;

    readonly ConcurrentDictionary<string, Entry> _entries = new(StringComparer.Ordinal);
    readonly object _pruneLock = new();
    readonly TimeProvider _time;

    public LoginThrottle(TimeProvider? time = null) => _time = time ?? TimeProvider.System;

    /// <summary>Mutated only while holding its own lock.</summary>
    sealed class Entry
    {
        public int Failures;
        public DateTimeOffset WindowStart;
        public DateTimeOffset? LockedUntil;
        /// <summary>Set (under the lock) when the entry leaves the dictionary; a writer holding it must start over.</summary>
        public bool Removed;

        public bool IsLocked(DateTimeOffset now) => LockedUntil is { } until && until > now;

        /// <summary>The entry still matters until the end of its window or of its lockout, whichever is later.</summary>
        public bool IsExpired(DateTimeOffset now) => !IsLocked(now) && now - WindowStart > Window;
    }

    // A newline cannot appear in a validated email, so the pair key is unambiguous.
    static string PairKey(string email, string client) => $"pair:{email}\n{client}";
    static string EmailKey(string email) => $"email:{email}";

    /// <summary>true while this client is locked out of the email, or the email is locked for everyone.</summary>
    public bool IsLocked(string email, string client)
    {
        var now = _time.GetUtcNow();
        return IsLocked(PairKey(email, client), now) || IsLocked(EmailKey(email), now);
    }

    bool IsLocked(string key, DateTimeOffset now)
    {
        if (!_entries.TryGetValue(key, out var entry)) return false;
        lock (entry) return !entry.Removed && entry.IsLocked(now);
    }

    public void RecordFailure(string email, string client)
    {
        var now = _time.GetUtcNow();
        Increment(PairKey(email, client), MaxFailures, now);
        Increment(EmailKey(email), MaxEmailFailures, now);
        if (_entries.Count > MaxTrackedKeys) Prune(now);
    }

    public void RecordSuccess(string email, string client)
    {
        Remove(PairKey(email, client));
        Remove(EmailKey(email));
    }

    void Increment(string key, int max, DateTimeOffset now)
    {
        while (true)
        {
            var entry = _entries.GetOrAdd(key, _ => new Entry { WindowStart = now });
            lock (entry)
            {
                // Removed between GetOrAdd and the lock: counting on it would be lost, so take the new one.
                if (entry.Removed) continue;

                if (now - entry.WindowStart > Window)
                {
                    entry.Failures = 0;
                    entry.WindowStart = now;
                }
                entry.Failures++;
                if (entry.Failures >= max)
                {
                    entry.LockedUntil = now + Lockout;
                    entry.Failures = 0;
                    entry.WindowStart = now;
                }
                return;
            }
        }
    }

    void Remove(string key)
    {
        if (!_entries.TryGetValue(key, out var entry)) return;
        lock (entry) RemoveLocked(key, entry);
    }

    /// <summary>Caller holds the entry's lock. Only removes that exact instance, never a newer one under the same key.</summary>
    void RemoveLocked(string key, Entry entry)
    {
        if (entry.Removed) return;
        entry.Removed = true;
        _entries.TryRemove(new KeyValuePair<string, Entry>(key, entry));
    }

    /// <summary>
    /// Drops expired entries; if that is not enough, drops the oldest unlocked ones, then the oldest locked ones,
    /// down to 90% of the cap. One thread prunes at a time; the others keep going.
    /// </summary>
    void Prune(DateTimeOffset now)
    {
        if (!Monitor.TryEnter(_pruneLock)) return;
        try
        {
            foreach (var (key, entry) in _entries)
            {
                lock (entry)
                {
                    if (entry.IsExpired(now)) RemoveLocked(key, entry);
                }
            }

            var excess = _entries.Count - MaxTrackedKeys * 9 / 10;
            if (excess <= 0) return;

            var oldest = _entries
                .Select(kv =>
                {
                    lock (kv.Value) return (kv.Key, kv.Value, Locked: kv.Value.IsLocked(now), kv.Value.WindowStart);
                })
                .OrderBy(e => e.Locked)
                .ThenBy(e => e.WindowStart)
                .Take(excess)
                .ToList();
            foreach (var (key, entry, _, _) in oldest)
            {
                lock (entry) RemoveLocked(key, entry);
            }
        }
        finally
        {
            Monitor.Exit(_pruneLock);
        }
    }
}
