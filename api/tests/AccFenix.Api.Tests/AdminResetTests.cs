using System.Net;
using System.Net.Http.Json;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Seed;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

/// <summary>
/// The reset-admin command. Uses its own database (outside the "api" collection) because it changes admin users
/// and spends login attempts.
/// </summary>
public class AdminResetTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    static IConfiguration Config(string? email, string? password) => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?> { ["Admin:Email"] = email, ["Admin:Password"] = password })
        .Build();

    Task<int> Run(string? email, string? password) =>
        AdminResetCommand.RunAsync(factory.Services, Config(email, password), CancellationToken.None);

    async Task<HttpStatusCode> Login(string email, string password)
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password });
        return res.StatusCode;
    }

    async Task<List<AdminUser>> Admins()
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().AdminUsers.AsNoTracking().OrderBy(u => u.Id).ToListAsync();
    }

    [Fact]
    public async Task Creates_admin_when_missing()
    {
        var code = await Run("new-admin@test.local", "brand-new-pass");

        code.Should().Be(0);
        (await Admins()).Should().ContainSingle(u => u.Email == "new-admin@test.local");
        (await Login("new-admin@test.local", "brand-new-pass")).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Resets_password_of_existing_admin_with_normalized_email_and_leaves_others_untouched()
    {
        await Run("other-admin@test.local", "other-password-1");
        var before = await Admins();
        var other = before.Single(u => u.Email == "other-admin@test.local");
        var target = before.Single(u => u.Email == ApiFactory.AdminEmail);

        var code = await Run("  " + ApiFactory.AdminEmail.ToUpperInvariant() + " ", "reset-password-456");

        code.Should().Be(0);
        var after = await Admins();
        after.Should().HaveCount(before.Count);
        after.Single(u => u.Id == target.Id).PasswordHash.Should().NotBe(target.PasswordHash);
        after.Single(u => u.Id == other.Id).PasswordHash.Should().Be(other.PasswordHash);
        (await Login(ApiFactory.AdminEmail, ApiFactory.AdminPassword)).Should().Be(HttpStatusCode.Unauthorized);
        (await Login(ApiFactory.AdminEmail, "reset-password-456")).Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData(null, "valid-password")]
    [InlineData("  ", "valid-password")]
    [InlineData("someone@test.local", null)]
    [InlineData("someone@test.local", "")]
    [InlineData("someone@test.local", "short")]
    public async Task Rejects_invalid_input_without_touching_admins(string? email, string? password)
    {
        var before = await Admins();

        var code = await Run(email, password);

        code.Should().NotBe(0);
        (await Admins()).Should().BeEquivalentTo(before);
    }

    [Fact]
    public void Minimum_password_length_is_eight()
    {
        AdminAccountService.MinPasswordLength.Should().Be(8);
    }
}
