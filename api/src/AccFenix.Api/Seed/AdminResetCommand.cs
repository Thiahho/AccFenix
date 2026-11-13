namespace AccFenix.Api.Seed;

/// <summary>
/// CLI command <c>reset-admin</c>: creates the admin from Admin:Email/Admin:Password or replaces its password.
/// Does not run migrations nor touch the catalog, settings or other users.
/// </summary>
public static class AdminResetCommand
{
    public const string Name = "reset-admin";

    /// <summary>Returns the process exit code: 0 on success, 1 on invalid configuration.</summary>
    public static async Task<int> RunAsync(IServiceProvider services, IConfiguration config, CancellationToken ct = default)
    {
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(AdminResetCommand));
        var email = config["Admin:Email"];
        var password = config["Admin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(password))
        {
            logger.LogError("Admin:Email/Admin:Password no configurados; no se modifica el usuario admin");
            return 1;
        }

        if (password.Length < AdminAccountService.MinPasswordLength)
        {
            logger.LogError("La contraseña del admin debe tener al menos {MinLength} caracteres", AdminAccountService.MinPasswordLength);
            return 1;
        }

        using var scope = services.CreateScope();
        var result = await scope.ServiceProvider.GetRequiredService<AdminAccountService>().CreateOrResetAsync(email, password, ct);
        var normalized = AdminAccountService.NormalizeEmail(email);
        if (result == AdminResetResult.Created)
        {
            logger.LogInformation("Admin creado: {Email}", normalized);
        }
        else
        {
            logger.LogInformation("Contraseña del admin actualizada: {Email}", normalized);
        }

        return 0;
    }
}
