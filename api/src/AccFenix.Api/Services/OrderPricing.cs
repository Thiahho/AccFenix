namespace AccFenix.Api.Services;

/// <summary>Pricing rules of an order. They mirror the cart rules of the site (web/lib/pricing.ts).</summary>
public static class OrderPricing
{
    /// <summary>Retail unit price of a variant; null when the variant is "price on request".</summary>
    public static decimal? UnitPrice(decimal? retailPrice, decimal addons = 0) => retailPrice + addons;
}
