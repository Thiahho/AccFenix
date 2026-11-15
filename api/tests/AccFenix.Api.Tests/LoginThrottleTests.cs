using AccFenix.Api.Services;
using FluentAssertions;

namespace AccFenix.Api.Tests;

public class LoginThrottleTests
{
    sealed class ManualClock : TimeProvider
    {
        public DateTimeOffset Now = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    const string Email = "admin@test.local";

    readonly ManualClock _clock = new();
    readonly LoginThrottle _throttle;

    public LoginThrottleTests() => _throttle = new LoginThrottle(_clock);

    void Fail(string client, int times = 1, string email = Email)
    {
        for (var i = 0; i < times; i++) _throttle.RecordFailure(email, client);
    }

    [Fact]
    public void Pair_locks_after_max_failures_and_only_for_that_client()
    {
        Fail("web:203.0.113.1", LoginThrottle.MaxFailures - 1);
        _throttle.IsLocked(Email, "web:203.0.113.1").Should().BeFalse();

        Fail("web:203.0.113.1");
        _throttle.IsLocked(Email, "web:203.0.113.1").Should().BeTrue();
        _throttle.IsLocked(Email, "web:203.0.113.2").Should().BeFalse();
        _throttle.IsLocked("other@test.local", "web:203.0.113.1").Should().BeFalse();
    }

    [Fact]
    public void Pair_lock_expires_after_the_lockout()
    {
        Fail("web:203.0.113.1", LoginThrottle.MaxFailures);

        _clock.Now += LoginThrottle.Lockout - TimeSpan.FromSeconds(1);
        _throttle.IsLocked(Email, "web:203.0.113.1").Should().BeTrue();
        _clock.Now += TimeSpan.FromSeconds(1);
        _throttle.IsLocked(Email, "web:203.0.113.1").Should().BeFalse();
    }

    [Fact]
    public void Failures_outside_the_window_do_not_add_up()
    {
        Fail("web:203.0.113.1", LoginThrottle.MaxFailures - 1);
        _clock.Now += LoginThrottle.Window + TimeSpan.FromSeconds(1);
        Fail("web:203.0.113.1");

        _throttle.IsLocked(Email, "web:203.0.113.1").Should().BeFalse();
    }

    [Fact]
    public void Email_wide_guard_triggers_only_at_its_threshold_across_clients()
    {
        for (var i = 0; i < LoginThrottle.MaxEmailFailures - 1; i++) Fail($"web:198.18.0.{i}");
        _throttle.IsLocked(Email, "web:203.0.113.99").Should().BeFalse();

        Fail("web:198.18.1.0");
        _throttle.IsLocked(Email, "web:203.0.113.99").Should().BeTrue();
        _throttle.IsLocked("other@test.local", "web:203.0.113.99").Should().BeFalse();
    }

    [Fact]
    public void Success_clears_the_pair_and_the_email_wide_count()
    {
        Fail("web:203.0.113.1", LoginThrottle.MaxFailures - 1);
        for (var i = 0; i < LoginThrottle.MaxEmailFailures - 1 - (LoginThrottle.MaxFailures - 1); i++) Fail($"web:198.18.0.{i}");

        _throttle.RecordSuccess(Email, "web:203.0.113.1");

        // Both counters start over: one more failure each locks neither.
        Fail("web:203.0.113.1");
        Fail("web:198.18.9.9");
        _throttle.IsLocked(Email, "web:203.0.113.1").Should().BeFalse();
        _throttle.IsLocked(Email, "web:203.0.113.99").Should().BeFalse();
    }

    [Fact]
    public void Concurrent_failures_are_all_counted()
    {
        for (var round = 0; round < 20; round++)
        {
            var email = $"race-{round}@test.local";
            var n = LoginThrottle.MaxEmailFailures - 1;

            Parallel.For(0, n, new ParallelOptions { MaxDegreeOfParallelism = 16 },
                i => _throttle.RecordFailure(email, $"web:198.18.{round}.{i}"));

            // Exactly n counted: one short of the threshold, so one more failure must lock it.
            _throttle.IsLocked(email, "web:203.0.113.99").Should().BeFalse();
            _throttle.RecordFailure(email, "web:203.0.113.98");
            _throttle.IsLocked(email, "web:203.0.113.99").Should().BeTrue();
        }
    }

    [Fact]
    public void Concurrent_failures_on_one_pair_are_all_counted()
    {
        for (var round = 0; round < 20; round++)
        {
            var client = $"web:203.0.113.{round}";
            Parallel.For(0, LoginThrottle.MaxFailures - 1, new ParallelOptions { MaxDegreeOfParallelism = 8 },
                _ => _throttle.RecordFailure(Email + round, client));

            _throttle.IsLocked(Email + round, client).Should().BeFalse();
            _throttle.RecordFailure(Email + round, client);
            _throttle.IsLocked(Email + round, client).Should().BeTrue();
        }
    }

    [Fact]
    public void Active_locks_survive_pruning_when_the_key_cap_is_reached()
    {
        Fail("web:203.0.113.1", LoginThrottle.MaxFailures);

        // Each failure adds a pair key and an email key.
        for (var i = 0; i < LoginThrottle.MaxTrackedKeys; i++) _throttle.RecordFailure($"flood{i}@test.local", "web:198.18.0.1");

        _throttle.IsLocked(Email, "web:203.0.113.1").Should().BeTrue();
    }
}
