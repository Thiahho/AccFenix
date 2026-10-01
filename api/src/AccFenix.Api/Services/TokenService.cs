using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AccFenix.Api.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AccFenix.Api.Services;

public class JwtOptions
{
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string Key { get; set; } = "";
    public int ExpiresHours { get; set; } = 12;

    public SymmetricSecurityKey SigningKey() => new(Encoding.UTF8.GetBytes(Key));
}

public record TokenResult(string Token, DateTime ExpiresAt);

public class TokenService(IOptions<JwtOptions> options)
{
    public TokenResult Create(AdminUser user)
    {
        var o = options.Value;
        var expires = DateTime.UtcNow.AddHours(o.ExpiresHours);
        var token = new JwtSecurityToken(
            issuer: o.Issuer,
            audience: o.Audience,
            claims: [new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim(JwtRegisteredClaimNames.Email, user.Email)],
            expires: expires,
            signingCredentials: new SigningCredentials(o.SigningKey(), SecurityAlgorithms.HmacSha256));
        return new TokenResult(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
