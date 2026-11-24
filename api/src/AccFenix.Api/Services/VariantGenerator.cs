using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Services;

public record GenerateResult(int Created, int Reactivated, int Deactivated, int Total);

public class VariantGenerator(AppDbContext db)
{
    /// <summary>
    /// Sincroniza las variantes del producto con el producto cartesiano de sus valores permitidos,
    /// agrupados por los atributos de su categoría. Las variantes existentes conservan su disponibilidad y sus precios;
    /// las que ya no corresponden se desactivan (no se borran).
    /// </summary>
    /// <remarks>Virtual so tests can substitute a failing generator.</remarks>
    public virtual async Task<GenerateResult> GenerateAsync(int productId, CancellationToken ct = default)
    {
        var product = await db.Products
            .Include(p => p.Category).ThenInclude(c => c.Attributes).ThenInclude(ca => ca.Attribute)
            .Include(p => p.AllowedValues).ThenInclude(a => a.AttributeValue)
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == productId, ct)
            ?? throw new KeyNotFoundException($"Producto {productId} no existe");

        // Add-ons are priced on their own and chosen per order line, so they never multiply the variants.
        var groups = product.Category.Attributes
            .Where(ca => !ca.Attribute.IsAddon)
            .OrderBy(ca => ca.SortOrder)
            .Select(ca => product.AllowedValues
                .Select(a => a.AttributeValue)
                .Where(v => v.AttributeId == ca.AttributeId)
                .OrderBy(v => v.SortOrder)
                .ToList())
            .Where(g => g.Count > 0)
            .ToList();

        var combos = Combine(groups);
        var existing = product.Variants.ToDictionary(v => v.CombinationKey);
        var wanted = new HashSet<string>();
        int created = 0, reactivated = 0, deactivated = 0;

        foreach (var combo in combos)
        {
            var key = KeyFor(combo.Select(v => v.Id));
            wanted.Add(key);
            if (existing.TryGetValue(key, out var variant))
            {
                if (!variant.IsActive)
                {
                    variant.IsActive = true;
                    reactivated++;
                }
                continue;
            }

            product.Variants.Add(new Variant
            {
                Sku = SkuFor(product.Id, product.Slug, combo),
                CombinationKey = key,
                Values = combo.Select(v => new VariantValue { AttributeValueId = v.Id }).ToList(),
            });
            created++;
        }

        foreach (var variant in existing.Values.Where(v => v.IsActive && !wanted.Contains(v.CombinationKey)))
        {
            variant.IsActive = false;
            deactivated++;
        }

        await db.SaveChangesAsync(ct);
        return new GenerateResult(created, reactivated, deactivated, wanted.Count);
    }

    /// <summary>Producto cartesiano de los grupos. Sin grupos devuelve una única combinación vacía (producto sin variantes).</summary>
    public static List<List<T>> Combine<T>(IReadOnlyList<IReadOnlyList<T>> groups)
    {
        var result = new List<List<T>> { new() };
        foreach (var group in groups)
        {
            result = result.SelectMany(prefix => group.Select(item => new List<T>(prefix) { item })).ToList();
        }
        return result;
    }

    public static string KeyFor(IEnumerable<int> valueIds) => string.Join('-', valueIds.Order());

    /// <summary>
    /// SKU = <c>{productId}-{productSlug}-{label slugs}</c>. The product id keeps SKUs unique across products.
    /// When longer than <see cref="Variant.SkuMaxLength"/>, it is cut and suffixed with <c>-</c> plus an 8-char hash
    /// of the full value, so it fits the column and stays deterministic and distinct.
    /// </summary>
    public static string SkuFor(int productId, string productSlug, IEnumerable<AttributeValue> combo)
    {
        var full = string.Join('-',
            new[] { productId.ToString(CultureInfo.InvariantCulture), productSlug }
                .Concat(combo.Select(v => Slug.From(v.Label)))
                .Where(s => s.Length > 0));
        if (full.Length <= Variant.SkuMaxLength) return full;

        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(full)), 0, 4).ToLowerInvariant();
        var prefix = full[..(Variant.SkuMaxLength - hash.Length - 1)].TrimEnd('-');
        return $"{prefix}-{hash}";
    }
}
