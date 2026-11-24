using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using AccFenix.Api.Domain;
using Microsoft.Extensions.Options;

namespace AccFenix.Api.Services;

/// <summary>Mercado Pago settings. The access token comes from the environment, never from the repo.</summary>
public class MercadoPagoOptions
{
    /// <summary>Access token of the Mercado Pago account (sandbox for tests).</summary>
    public string AccessToken { get; set; } = "";
    /// <summary>Public URL of the webhook of this API, e.g. https://api.example.com/api/payments/mercadopago/webhook.</summary>
    public string NotificationUrl { get; set; } = "";
    /// <summary>Public URL of the site, where Mercado Pago sends the customer back after paying.</summary>
    public string SiteUrl { get; set; } = "";
    /// <summary>Secret of the webhook, from "Tus integraciones". With it, unsigned notifications are rejected.</summary>
    public string WebhookSecret { get; set; } = "";
    public string ApiBaseUrl { get; set; } = "https://api.mercadopago.com/";
}

/// <summary>A checkout preference created in Mercado Pago: where the customer pays.</summary>
public record CheckoutPreference(string Id, string InitPoint);

/// <summary>The part of a Mercado Pago payment that the API checks before marking an order as paid.</summary>
public record MercadoPagoPayment(string Id, string Status, string? ExternalReference, decimal TransactionAmount);

/// <summary>
/// Thin client of the Mercado Pago REST API (Checkout Pro). It only talks to Mercado Pago with the server token;
/// the webhook never trusts the body it receives, it asks Mercado Pago for the payment again.
/// </summary>
public sealed class MercadoPagoClient(HttpClient http, IOptions<MercadoPagoOptions> options, ILogger<MercadoPagoClient> logger)
{
    readonly MercadoPagoOptions _options = options.Value;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.AccessToken) && !string.IsNullOrWhiteSpace(_options.SiteUrl);

    public string WebhookSecret => _options.WebhookSecret;

    /// <summary>Mercado Pago rejects automatic return to a local or non-HTTPS address.</summary>
    bool CanAutoReturn => Uri.TryCreate(_options.SiteUrl, UriKind.Absolute, out var site) && site.Scheme == Uri.UriSchemeHttps && !site.IsLoopback;

    /// <summary>Creates a checkout preference for a confirmed order. The order number is the external reference.</summary>
    public async Task<CheckoutPreference> CreatePreferenceAsync(Order order, CancellationToken ct)
    {
        var siteUrl = _options.SiteUrl.TrimEnd('/');
        var body = new Dictionary<string, object?>
        {
            ["items"] = order.Items.Select(i => new Dictionary<string, object?>
            {
                ["title"] = Title(i),
                ["quantity"] = i.Quantity,
                ["unit_price"] = i.UnitPrice,
                ["currency_id"] = "ARS",
            }).ToList(),
            ["external_reference"] = order.Number.ToString(CultureInfo.InvariantCulture),
            ["back_urls"] = new Dictionary<string, object?>
            {
                ["success"] = $"{siteUrl}/pedido/gracias?pedido={order.Number}&resena={order.ReviewToken}",
                ["pending"] = $"{siteUrl}/pedido/gracias?pedido={order.Number}&resena={order.ReviewToken}",
                ["failure"] = $"{siteUrl}/pedido/pago-rechazado?pedido={order.Number}",
            },
        };
        if (CanAutoReturn) body["auto_return"] = "approved";
        if (!string.IsNullOrWhiteSpace(_options.NotificationUrl)) body["notification_url"] = _options.NotificationUrl;

        using var request = new HttpRequestMessage(HttpMethod.Post, "checkout/preferences") { Content = JsonContent.Create(body) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AccessToken);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Mercado Pago rejected the preference of order {OrderNumber}: HTTP {Status}", order.Number, (int)response.StatusCode);
            throw new InvalidOperationException("Mercado Pago no aceptó la preferencia de pago");
        }

        var dto = await response.Content.ReadFromJsonAsync<PreferenceResponse>(ct)
            ?? throw new InvalidOperationException("Respuesta vacía de Mercado Pago");
        // A TEST- token only pays in the sandbox checkout.
        var checkoutUrl = _options.AccessToken.StartsWith("TEST-", StringComparison.Ordinal) ? dto.SandboxInitPoint ?? dto.InitPoint : dto.InitPoint;
        return new CheckoutPreference(dto.Id, checkoutUrl);
    }

    /// <summary>Reads a payment from Mercado Pago. Null when Mercado Pago does not know that id.</summary>
    public async Task<MercadoPagoPayment?> GetPaymentAsync(string paymentId, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"v1/payments/{Uri.EscapeDataString(paymentId)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AccessToken);
        using var response = await http.SendAsync(request, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Mercado Pago failed to return payment {PaymentId}: HTTP {Status}", paymentId, (int)response.StatusCode);
            throw new InvalidOperationException("No se pudo consultar el pago en Mercado Pago");
        }

        var dto = await response.Content.ReadFromJsonAsync<PaymentResponse>(ct)
            ?? throw new InvalidOperationException("Respuesta vacía de Mercado Pago");
        return new MercadoPagoPayment(dto.Id.ToString(CultureInfo.InvariantCulture), dto.Status, dto.ExternalReference, dto.TransactionAmount);
    }

    static string Title(OrderItem i)
    {
        var title = string.IsNullOrWhiteSpace(i.VariantLabel) ? i.ProductName : $"{i.ProductName} ({i.VariantLabel})";
        return title.Length <= 256 ? title : title[..256];
    }

    record PreferenceResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("init_point")] string InitPoint,
        [property: JsonPropertyName("sandbox_init_point")] string? SandboxInitPoint);

    record PaymentResponse(
        [property: JsonPropertyName("id")] long Id,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("external_reference")] string? ExternalReference,
        [property: JsonPropertyName("transaction_amount")] decimal TransactionAmount);
}
