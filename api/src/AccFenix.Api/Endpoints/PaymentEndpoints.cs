using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

public record MercadoPagoWebhookBody(string? Type, MercadoPagoWebhookData? Data);
public record MercadoPagoWebhookData(System.Text.Json.JsonElement? Id);

public static class PaymentEndpoints
{
    const string LogCategory = "AccFenix.Api.Payments";

    public static void MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        // Mercado Pago calls this URL when a payment changes. The order is marked as paid only when Mercado Pago
        // confirms the payment as approved, for the same amount as the order. Anything else answers 200 and changes nothing,
        // so Mercado Pago does not keep retrying a notification we already handled.
        app.MapPost("/api/payments/mercadopago/webhook", async (HttpContext ctx, AppDbContext db, MercadoPagoClient mercadoPago, ILoggerFactory loggers, CancellationToken ct) =>
        {
            var log = loggers.CreateLogger(LogCategory);
            var type = ctx.Request.Query["type"].FirstOrDefault();
            var paymentId = ctx.Request.Query["data.id"].FirstOrDefault();
            if (string.IsNullOrEmpty(paymentId))
            {
                try
                {
                    var body = await ctx.Request.ReadFromJsonAsync<MercadoPagoWebhookBody>(ct);
                    type ??= body?.Type;
                    paymentId = body?.Data?.Id?.ToString();
                }
                catch (System.Text.Json.JsonException)
                {
                    // Without a readable body there is no payment to check.
                }
            }

            if (type is not null && type != "payment") return Results.Ok();
            if (string.IsNullOrWhiteSpace(paymentId)) return Results.Ok();
            if (!mercadoPago.IsConfigured)
            {
                log.LogWarning("Mercado Pago notification received, but the access token is not configured");
                return Results.Ok();
            }

            var payment = await mercadoPago.GetPaymentAsync(paymentId, ct);
            if (payment is null || payment.Status != "approved") return Results.Ok();

            if (!int.TryParse(payment.ExternalReference, out var number))
            {
                log.LogWarning("Approved payment {PaymentId} has no valid order reference", paymentId);
                return Results.Ok();
            }

            var order = await db.Orders.FirstOrDefaultAsync(o => o.Number == number, ct);
            if (order is null)
            {
                log.LogWarning("Approved payment {PaymentId} refers to unknown order {OrderNumber}", paymentId, number);
                return Results.Ok();
            }
            if (order.PaymentStatus == PaymentStatus.Approved) return Results.Ok();
            if (payment.TransactionAmount != order.Total)
            {
                log.LogWarning("Payment {PaymentId} amount does not match order {OrderNumber}; not marked as paid", paymentId, number);
                return Results.Ok();
            }

            order.PaymentStatus = PaymentStatus.Approved;
            order.PaidAt = DateTime.UtcNow;
            order.MercadoPagoPaymentId = payment.Id;
            await db.SaveChangesAsync(ct);
            log.LogInformation("Order {OrderNumber} marked as paid", number);
            return Results.Ok();
        }).WithTags("Public");

        // Lets the thank-you page know whether the payment is in. Only the payment state and its date are returned,
        // no customer data, so the order number alone is not enough to learn anything about the order.
        app.MapGet("/api/orders/{number:int}/payment", async (int number, AppDbContext db, CancellationToken ct) =>
        {
            var status = await db.Orders
                .Where(o => o.Number == number)
                .Select(o => new OrderPaymentDto(o.Number, o.PaymentStatus, o.PaidAt))
                .FirstOrDefaultAsync(ct);
            return status is null ? Results.NotFound() : Results.Ok(status);
        }).WithTags("Public");
    }
}

public record OrderPaymentDto(int Number, PaymentStatus PaymentStatus, DateTime? PaidAt);
