namespace AccFenix.Api.Services;

/// <summary>Pricing rules of an order. They mirror the cart rules of the site (web/lib/pricing.ts).</summary>
public static class OrderPricing
{
    /// <summary>An order is wholesale when its priced units reach the threshold; a threshold of 0 disables wholesale.</summary>
    public static bool IsWholesale(int pricedUnits, int threshold) => threshold > 0 && pricedUnits >= threshold;

    /// <summary>
    /// Units count towards the wholesale threshold only when they can be charged: a variant with any price (retail or
    /// wholesale). Units quoted on request do not count.
    /// </summary>
    public static bool CountsTowardWholesale(decimal? retailPrice, decimal? wholesalePrice) =>
        retailPrice is not null || wholesalePrice is not null;

    /// <summary>Wholesale price when the order is wholesale and the variant has one; otherwise retail; null when unpriced.</summary>
    public static decimal? UnitPrice(decimal? retailPrice, decimal? wholesalePrice, bool isWholesale) =>
        isWholesale && wholesalePrice is not null ? wholesalePrice : retailPrice;
}
