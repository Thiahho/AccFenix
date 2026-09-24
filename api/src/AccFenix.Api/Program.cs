using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using AccFenix.Api.Data;
using AccFenix.Api.Endpoints;
using AccFenix.Api.Seed;
using AccFenix.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(config.GetConnectionString("Default")));
builder.Services.AddScoped<VariantGenerator>();
builder.Services.AddScoped<CatalogSeeder>();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.Configure<CloudinaryOptions>(config.GetSection("Cloudinary"));
builder.Services.AddSingleton<IMediaStorage, CloudinaryMediaStorage>();

// ---- Auth (JWT para el panel admin) ----
builder.Services.AddOptions<JwtOptions>()
    .Bind(config.GetSection("Jwt"))
    .Validate(o => o.Key.Length >= 32, "Jwt:Key debe tener al menos 32 caracteres")
    .ValidateOnStart();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<Microsoft.Extensions.Options.IOptions<JwtOptions>>((o, jwt) =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Value.Issuer,
            ValidAudience = jwt.Value.Audience,
            IssuerSigningKey = jwt.Value.SigningKey(),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy(AuthEndpoints.LoginRateLimit, ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(5) }));
});

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddProblemDetails();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(config.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

if (args.Contains("seed"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<CatalogSeeder>().SeedAsync();
    return;
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapPublicEndpoints();
app.MapAuthEndpoints();
app.MapGroup("/api/admin")
    .RequireAuthorization()
    .WithTags("Admin")
    .MapAdminCatalogEndpoints()
    .MapAdminMediaEndpoints();

app.Run();

public partial class Program;
