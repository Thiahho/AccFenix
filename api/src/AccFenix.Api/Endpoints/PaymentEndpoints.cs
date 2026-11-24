using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Endpoints;

public record MercadoPagoWebhookBody(string? Type, MercadoPagoWebhookData? Data);
public record MercadoPagoWebhookData(System.Text.Json.JsonElement? Id);
public record ConfirmPaymentRequest(string? PaymentId);

public static class PaymentEndpoints
{
    public const string ConfirmRateLimit = "payment-confirm";
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

            if (!string.IsNullOrEmpty(mercadoPago.WebhookSecret))
            {
                // Legacy IPN notifications carry no signature; the signed webhook for the same payment does the work.
                if (ctx.Request.Query.ContainsKey("topic")) return Results.Ok();
                if (!MercadoPagoSignature.IsValid(mercadoPago.WebhookSecret, ctx.Request.Headers["x-signature"], ctx.Request.Headers["x-request-id"], paymentId))
                {
                    log.LogWarning("Mercado Pago notification rejected: invalid signature");
                    return Results.Unauthorized();
                }
            }

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

            await ApplyPaymentAsync(paymentId, null, db, mercadoPago, log, ct);
            return Results.Ok();
        }).WithTags("Public");

        // Lets the thank-you page know whether the payment is in. Only the payment state and its date are returned,
        // no customer data, so the order number alone is not enough to learn anything about the order.
        app.MapGet("/api/orders/{number:int}/payment", async (int number, AppDbContext db, CancellationToken ct) =>
        {
            var status = await PaymentStatusOf(db, number, ct);
            return status is null ? Results.NotFound() : Results.Ok(status);
        }).WithTags("Public");

        // The customer comes back with a payment id. It proves nothing by itself: Mercado Pago is asked for that payment,
        // which must belong to this order and match its amount. It covers a webhook that is late or cannot reach this API.
        app.MapPost("/api/orders/{number:int}/payment/confirm", async (int number, ConfirmPaymentRequest req, AppDbContext db, MercadoPagoClient mercadoPago, ILoggerFactory loggers, CancellationToken ct) =>
        {
            if (req.PaymentId is not { Length: > 0 and <= 30 } paymentId || !paymentId.All(char.IsAsciiDigit)) return Results.BadRequest();
            if (mercadoPago.IsConfigured)
            {
                var log = loggers.CreateLogger(LogCategory);
                try
                {
                    await ApplyPaymentAsync(paymentId, number, db, mercadoPago, log, ct);
                }
                catch (Exception e) when (e is HttpRequestException or InvalidOperationException or System.Text.Json.JsonException)
                {
                    // The webhook can still confirm it; the page keeps showing the current state.
                    log.LogWarning(e, "Could not confirm payment {PaymentId} of order {OrderNumber}", paymentId, number);
                }
            }
            var status = await PaymentStatusOf(db, number, ct);
            return status is null ? Results.NotFound() : Results.Ok(status);
        })
        .RequireRateLimiting(ConfirmRateLimit)
        .WithTags("Public");
    }

    static Task<OrderPaymentDto?> PaymentStatusOf(AppDbContext db, int number, CancellationToken ct) =>
        db.Orders
            .Where(o => o.Number == number)
            .Select(o => new OrderPaymentDto(o.Number, o.PaymentStatus, o.PaidAt))
            .FirstOrDefaultAsync(ct);

    /// <summary>
    /// Applies the current state of a payment: approved marks the order as paid (same order, exact amount); refunded or
    /// charged back reverses the payment that paid it.
    /// </summary>
    static async Task ApplyPaymentAsync(string paymentId, int? expectedNumber, AppDbContext db, MercadoPagoClient mercadoPago, ILogger log, CancellationToken ct)
    {
        var payment = await mercadoPago.GetPaymentAsync(paymentId, ct);
        var reversed = payment?.Status is "refunded" or "charged_back";
        if (payment is null || (payment.Status != "approved" && !reversed)) return;

        if (!int.TryParse(payment.ExternalReference, out var number))
        {
            log.LogWarning("Payment {PaymentId} has no valid order reference", paymentId);
            return;
        }
        if (expectedNumber is not null && expectedNumber != number)
        {
            log.LogWarning("Payment {PaymentId} does not belong to order {OrderNumber}", paymentId, expectedNumber);
            return;
        }

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Number == number, ct);
        if (order is null)
        {
            log.LogWarning("Payment {PaymentId} refers to unknown order {OrderNumber}", paymentId, number);
            return;
        }
        if (reversed)
        {
            // Only the payment that paid this order can reverse it.
            if (order.PaymentStatus != PaymentStatus.Approved || order.MercadoPagoPaymentId != payment.Id) return;
            order.PaymentStatus = PaymentStatus.Refunded;
            // Not prepared yet: it stops here. Once on its way or delivered, the owner decides.
            if (order.Status is OrderStatus.Pending or OrderStatus.Confirmed) order.Status = OrderStatus.Cancelled;
            await db.SaveChangesAsync(ct);
            log.LogWarning("Order {OrderNumber} reversed: payment {PaymentId} is {PaymentStatus}", number, paymentId, payment.Status);
            return;
        }

        if (order.PaymentStatus == PaymentStatus.Approved) return;
        if (payment.TransactionAmount != order.Total)
        {
            log.LogWarning("Payment {PaymentId} amount does not match order {OrderNumber}; not marked as paid", paymentId, number);
            return;
        }

        order.PaymentStatus = PaymentStatus.Approved;
        order.PaidAt = DateTime.UtcNow;
        order.MercadoPagoPaymentId = payment.Id;
        await db.SaveChangesAsync(ct);
        log.LogInformation("Order {OrderNumber} marked as paid", number);
    }
}

public record OrderPaymentDto(int Number, PaymentStatus PaymentStatus, DateTime? PaidAt);
