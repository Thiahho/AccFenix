using System.Net;
using System.Net.Http.Json;
using AccFenix.Api.Seed;
using AccFenix.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

/// <summary>El límite de intentos de login es por visitante. Usa su propia API para no compartir cupos con otros tests.</summary>
public class LoginRateLimitTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    const int Limit = 10;

    readonly HttpClient _client = factory.CreateClient();

    Task<HttpResponseMessage> Login(string password, string? ip, string? key = ApiFactory.TrustedWebKey, string email = ApiFactory.AdminEmail)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email, password }),
        };
        if (ip is not null) req.Headers.Add(ClientIp.IpHeader, ip);
        if (key is not null) req.Headers.Add(ClientIp.KeyHeader, key);
        return _client.SendAsync(req);
    }

    [Fact]
    public async Task Failed_attempts_from_one_visitor_do_not_block_another()
    {
        // A different email per attempt, so the per-account lockout does not kick in before the per-visitor limit.
        for (var i = 0; i < Limit; i++)
        {
            (await Login("incorrecta", "203.0.113.10", email: $"intruso{i}@test.local")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
        (await Login("incorrecta", "203.0.113.10")).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        (await Login(ApiFactory.AdminPassword, "203.0.113.10")).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        // El admin real, desde otra IP, entra sin problema.
        (await Login(ApiFactory.AdminPassword, "203.0.113.20")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Client_ip_header_is_ignored_without_the_shared_key()
    {
        // Sin la clave (o con una incorrecta) cambiar la cabecera no da un cupo nuevo: cuenta la IP de la conexión.
        for (var i = 0; i < Limit; i++)
        {
            var key = i % 2 == 0 ? null : "clave-incorrecta-0123456789abcdef0123";
            (await Login("incorrecta", $"198.51.100.{i}", key, $"sin-clave{i}@test.local")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
        (await Login("incorrecta", "198.51.100.200", key: null)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        // Ese cupo agotado no afecta a quien entra por la web.
        (await Login(ApiFactory.AdminPassword, "203.0.113.30")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ---- Per-account lockout ----

    static int _nextIp;

    /// <summary>A fresh address per call (198.18.0.0/15, reserved for benchmarking), so the per-visitor limit never applies.</summary>
    static string NewIp()
    {
        var n = Interlocked.Increment(ref _nextIp);
        return $"198.18.{n / 256}.{n % 256}";
    }

    /// <summary>Each attempt comes from a new address, as in a distributed attack.</summary>
    Task<HttpResponseMessage> LoginFromNewIp(string email, string password) => Login(password, NewIp(), email: email);

    async Task<string> NewAdmin(string password)
    {
        var email = $"lockout-{Guid.NewGuid():N}@test.local";
        using var scope = factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<AdminAccountService>().CreateIfMissingAsync(email, password)).Should().BeTrue();
        return email;
    }

    [Fact]
    public async Task Repeated_failures_lock_that_address_for_that_account()
    {
        const string password = "lockout-password-1";
        var email = await NewAdmin(password);
        var attacker = NewIp();

        for (var i = 0; i < LoginThrottle.MaxFailures; i++)
        {
            (await Login("incorrecta", attacker, email: email)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // Even the right password is refused from that address while the pair is locked.
        (await Login(password, attacker, email: email)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        // Other accounts are not affected, not even from the same address.
        (await Login(ApiFactory.AdminPassword, attacker)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task An_attacker_locking_the_account_from_one_address_does_not_lock_out_the_owner()
    {
        const string password = "lockout-password-owner";
        var email = await NewAdmin(password);
        var attacker = NewIp();

        for (var i = 0; i < LoginThrottle.MaxFailures; i++)
        {
            (await Login("incorrecta", attacker, email: email)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
        (await Login("incorrecta", attacker, email: email)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        // The real admin, from their own address, still gets in with the right password.
        (await Login(password, NewIp(), email: email)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Successful_login_resets_the_failure_count()
    {
        const string password = "lockout-password-2";
        var email = await NewAdmin(password);
        var ip = NewIp();

        for (var round = 0; round < 2; round++)
        {
            for (var i = 0; i < LoginThrottle.MaxFailures - 1; i++)
            {
                (await Login("incorrecta", ip, email: email)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            }
            (await Login(password, ip, email: email)).StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task Unknown_emails_are_locked_like_real_ones()
    {
        var email = $"nadie-{Guid.NewGuid():N}@test.local";
        var ip = NewIp();

        for (var i = 0; i < LoginThrottle.MaxFailures; i++)
        {
            (await Login("incorrecta", ip, email: email)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        (await Login("incorrecta", ip, email: email)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Distributed_failures_lock_the_account_for_everyone_above_the_email_threshold()
    {
        const string password = "lockout-password-3";
        var email = await NewAdmin(password);

        for (var i = 0; i < LoginThrottle.MaxEmailFailures; i++)
        {
            (await LoginFromNewIp(email, "incorrecta")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // Even the right password from an address that never failed is refused.
        (await LoginFromNewIp(email, password)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Theory]
    [InlineData("203.0.113.5", "web:203.0.113.5")]
    [InlineData("::ffff:203.0.113.5", "web:203.0.113.5")]
    [InlineData("2001:db8:1:2:aaaa:bbbb:cccc:dddd", "web:2001:db8:1:2::/64")]
    [InlineData("no-es-una-ip", "direct:unknown")]
    [InlineData("", "direct:unknown")]
    public void Partition_key_uses_the_forwarded_ip_only_when_valid(string ip, string expected)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Headers[ClientIp.IpHeader] = ip;
        ctx.Request.Headers[ClientIp.KeyHeader] = ApiFactory.TrustedWebKey;

        ClientIp.PartitionKey(ctx, ApiFactory.TrustedWebKey).Should().Be(expected);
    }

    [Fact]
    public void Partition_key_ignores_the_header_when_no_key_is_configured()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Headers[ClientIp.IpHeader] = "203.0.113.5";
        ctx.Request.Headers[ClientIp.KeyHeader] = "";

        ClientIp.PartitionKey(ctx, trustedKey: "").Should().Be("direct:unknown");
    }
}
