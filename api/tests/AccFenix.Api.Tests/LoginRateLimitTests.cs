using System.Net;
using System.Net.Http.Json;
using AccFenix.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace AccFenix.Api.Tests;

/// <summary>El límite de intentos de login es por visitante. Usa su propia API para no compartir cupos con otros tests.</summary>
public class LoginRateLimitTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    const int Limit = 10;

    readonly HttpClient _client = factory.CreateClient();

    Task<HttpResponseMessage> Login(string password, string? ip, string? key = ApiFactory.TrustedWebKey)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = ApiFactory.AdminEmail, password }),
        };
        if (ip is not null) req.Headers.Add(ClientIp.IpHeader, ip);
        if (key is not null) req.Headers.Add(ClientIp.KeyHeader, key);
        return _client.SendAsync(req);
    }

    [Fact]
    public async Task Failed_attempts_from_one_visitor_do_not_block_another()
    {
        for (var i = 0; i < Limit; i++)
        {
            (await Login("incorrecta", "203.0.113.10")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
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
            (await Login("incorrecta", $"198.51.100.{i}", key)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
        (await Login("incorrecta", "198.51.100.200", key: null)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        // Ese cupo agotado no afecta a quien entra por la web.
        (await Login(ApiFactory.AdminPassword, "203.0.113.30")).StatusCode.Should().Be(HttpStatusCode.OK);
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
