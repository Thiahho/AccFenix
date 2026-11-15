using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AccFenix.Api.Services;

public class JwtOptions
{
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string Key { get; set; } = "";
    public int ExpiresHours { get; set; } = 4;

    public SymmetricSecurityKey SigningKey() => new(Encoding.UTF8.GetBytes(Key));
}

public record TokenResult(string Token, DateTime ExpiresAt);

public class TokenService(IOptions<JwtOptions> options)
{
    /// <summary>Claim that carries the admin's security stamp; see <see cref="AdminUser.SecurityStamp"/>.</summary>
    public const string SecurityStampClaim = "stamp";

    public TokenResult Create(AdminUser user)
    {
        var o = options.Value;
        var expires = DateTime.UtcNow.AddHours(o.ExpiresHours);
        var token = new JwtSecurityToken(
            issuer: o.Issuer,
            audience: o.Audience,
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString(CultureInfo.InvariantCulture)),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(SecurityStampClaim, user.SecurityStamp),
            ],
            expires: expires,
            signingCredentials: new SigningCredentials(o.SigningKey(), SecurityAlgorithms.HmacSha256));
        return new TokenResult(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    /// <summary>
    /// Runs after the signature and lifetime checks: the token must belong to an admin that still exists
    /// and whose security stamp has not changed since the token was issued.
    /// </summary>
    public static async Task ValidateAdminAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        var sub = principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        var stamp = principal?.FindFirst(SecurityStampClaim)?.Value;
        if (!int.TryParse(sub, NumberStyles.None, CultureInfo.InvariantCulture, out var id) || string.IsNullOrEmpty(stamp))
        {
            context.Fail("Token sin usuario o sello de seguridad");
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var current = await db.AdminUsers.AnyAsync(u => u.Id == id && u.SecurityStamp == stamp, context.HttpContext.RequestAborted);
        if (!current) context.Fail("El usuario ya no existe o sus credenciales cambiaron");
    }
}
