using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using AccFenix.Api.Data;
using AccFenix.Api.Endpoints;
using AccFenix.Api.Seed;
using AccFenix.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(config.GetConnectionString("Default")));
builder.Services.AddScoped<VariantGenerator>();
builder.Services.AddScoped<AdminAccountService>();
builder.Services.AddScoped<CatalogSeeder>();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.Configure<CloudinaryOptions>(config.GetSection("Cloudinary"));
builder.Services.AddSingleton<IMediaStorage, CloudinaryMediaStorage>();

// Mercado Pago (Checkout Pro). Sin token configurado, los pedidos se crean pero no abren el pago.
builder.Services.Configure<MercadoPagoOptions>(config.GetSection("MercadoPago"));
builder.Services.AddHttpClient<MercadoPagoClient>(c =>
    c.BaseAddress = new Uri(config["MercadoPago:ApiBaseUrl"] is { Length: > 0 } url ? url : new MercadoPagoOptions().ApiBaseUrl));

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
        // A deleted admin, or one whose password was reset, cannot keep using the tokens issued before.
        o.Events = new JwtBearerEvents { OnTokenValidated = TokenService.ValidateAdminAsync };
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton(_ => new LoginThrottle());

builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>();
// One line per request with method, path (no query string), status and duration: no headers nor bodies.
builder.Services.AddHttpLogging(o =>
{
    o.LoggingFields = HttpLoggingFields.RequestMethod | HttpLoggingFields.RequestPath
        | HttpLoggingFields.ResponseStatusCode | HttpLoggingFields.Duration;
    o.CombineLogs = true;
});

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // Un cupo por visitante: los intentos fallidos de uno no bloquean el login de otro.
    o.AddPolicy(AuthEndpoints.LoginRateLimit, ctx => RateLimitPartition.GetFixedWindowLimiter(
        Visitor(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(5) }));
    // Order creation is public and writes to the database: each visitor gets a separate, small quota.
    o.AddPolicy(OrderEndpoints.CreateRateLimit, ctx => RateLimitPartition.GetFixedWindowLimiter(
        Visitor(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = OrderEndpoints.CreatePermitLimit, Window = OrderEndpoints.CreateWindow }));
    // Review links are secret tokens: the quota also slows down anyone trying to guess one.
    o.AddPolicy(ReviewEndpoints.RateLimit, ctx => RateLimitPartition.GetFixedWindowLimiter(
        Visitor(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = ReviewEndpoints.PermitLimit, Window = ReviewEndpoints.Window }));

    // Each confirmation asks Mercado Pago for the payment, so one visitor cannot trigger them without limit.
    o.AddPolicy(PaymentEndpoints.ConfirmRateLimit, ctx => RateLimitPartition.GetFixedWindowLimiter(
        Visitor(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(10) }));

    static string Visitor(HttpContext ctx) =>
        ClientIp.PartitionKey(ctx, ctx.RequestServices.GetRequiredService<IConfiguration>()["TrustedWeb:Key"] ?? "");
});

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false)));
builder.Services.AddProblemDetails();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(config.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

if (app.Configuration["TrustedWeb:Key"] is { Length: > 0 and < 32 })
{
    throw new InvalidOperationException("TrustedWeb:Key debe tener al menos 32 caracteres");
}

if (args.Contains("seed"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<CatalogSeeder>().SeedAsync();
    return;
}

if (args.Contains(AdminResetCommand.Name))
{
    Environment.ExitCode = await AdminResetCommand.RunAsync(app.Services, app.Configuration);
    return;
}

app.UseHttpLogging();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Liveness: the process answers. Readiness: it can also reach the database.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapHealthChecks("/health/ready");
app.MapPublicEndpoints();
app.MapOrderEndpoints();
app.MapPaymentEndpoints();
app.MapAuthEndpoints();
app.MapReviewEndpoints();
app.MapGroup("/api/admin")
    .RequireAuthorization()
    .AddEndpointFilter<UniqueViolationFilter>()
    .WithTags("Admin")
    .MapAdminCatalogEndpoints()
    .MapAdminMediaEndpoints()
    .MapAdminOrderEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapDevEndpoints();
}

app.Run();

public partial class Program;
