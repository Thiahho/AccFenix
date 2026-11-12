namespace AccFenix.Api.Services;

/// <summary>Pricing rules of an order. They mirror the cart rules of the site (web/lib/pricing.ts).</summary>
public static class OrderPricing
{
    /// <summary>An order is wholesale when its total units reach the threshold; a threshold of 0 disables wholesale.</summary>
    public static bool IsWholesale(int totalUnits, int threshold) => threshold > 0 && totalUnits >= threshold;

    /// <summary>Wholesale price when the order is wholesale and the variant has one; otherwise retail; null when unpriced.</summary>
    public static decimal? UnitPrice(decimal? retailPrice, decimal? wholesalePrice, bool isWholesale) =>
        isWholesale && wholesalePrice is not null ? wholesalePrice : retailPrice;
}
