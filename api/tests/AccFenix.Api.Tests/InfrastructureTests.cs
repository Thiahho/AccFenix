using System.Net;
using AccFenix.Api.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AccFenix.Api.Tests;

[Collection(ApiCollection.Name)]
public class InfrastructureTests(ApiFactory factory)
{
    /// <summary>Fails when the model changed without a migration (run <c>dotnet ef migrations add</c>).</summary>
    [Fact]
    public void Model_has_no_pending_changes()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Database.HasPendingModelChanges().Should().BeFalse();
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/health/ready")]
    public async Task Health_endpoints_report_healthy(string url)
    {
        var res = await factory.CreateClient().GetAsync(url);

        res.StatusCode.Should().Be(HttpStatusCode.OK, await res.Content.ReadAsStringAsync());
    }
}
