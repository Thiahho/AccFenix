using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Seed;

public enum AdminResetResult
{
    Created,
    PasswordReset,
}

/// <summary>Creates admin users or replaces their password. Only touches the admin with the given email.</summary>
public class AdminAccountService(AppDbContext db)
{
    /// <summary>The login validator has no minimum length, so the reset command enforces its own.</summary>
    public const int MinPasswordLength = 8;

    static readonly PasswordHasher<AdminUser> Hasher = new();

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    /// <summary>Creates the admin only if it does not exist yet. Returns true when it was created.</summary>
    public async Task<bool> CreateIfMissingAsync(string email, string password, CancellationToken ct = default)
    {
        email = NormalizeEmail(email);
        if (await db.AdminUsers.AnyAsync(u => u.Email == email, ct)) return false;

        Add(email, password);
        await db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>Replaces the admin's password, creating the admin when it does not exist.</summary>
    /// <remarks>
    /// Login lockouts (<see cref="Services.LoginThrottle"/>) live in the memory of the running API, while the
    /// <c>reset-admin</c> command runs as a separate process, so it cannot clear them: restart the API to do so.
    /// </remarks>
    public async Task<AdminResetResult> CreateOrResetAsync(string email, string password, CancellationToken ct = default)
    {
        email = NormalizeEmail(email);
        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == email, ct);
        AdminResetResult result;
        if (user is null)
        {
            Add(email, password);
            result = AdminResetResult.Created;
        }
        else
        {
            user.PasswordHash = Hasher.HashPassword(user, password);
            // Tokens issued with the old password stop working.
            user.SecurityStamp = AdminUser.NewSecurityStamp();
            result = AdminResetResult.PasswordReset;
        }

        await db.SaveChangesAsync(ct);
        return result;
    }

    void Add(string email, string password)
    {
        var user = new AdminUser { Email = email };
        user.PasswordHash = Hasher.HashPassword(user, password);
        db.AdminUsers.Add(user);
    }
}
