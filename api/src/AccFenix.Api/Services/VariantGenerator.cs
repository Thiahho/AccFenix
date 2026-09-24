using AccFenix.Api.Data;
using AccFenix.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace AccFenix.Api.Services;

public record GenerateResult(int Created, int Reactivated, int Deactivated, int Total);

public class VariantGenerator(AppDbContext db)
{
    /// <summary>
    /// Sincroniza las variantes del producto con el producto cartesiano de sus valores permitidos,
    /// agrupados por los atributos de su categoría. Las variantes existentes conservan su disponibilidad;
    /// las que ya no corresponden se desactivan (no se borran).
    /// </summary>
    public async Task<GenerateResult> GenerateAsync(int productId, CancellationToken ct = default)
    {
        var product = await db.Products
            .Include(p => p.Category).ThenInclude(c => c.Attributes)
            .Include(p => p.AllowedValues).ThenInclude(a => a.AttributeValue)
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == productId, ct)
            ?? throw new KeyNotFoundException($"Producto {productId} no existe");

        var groups = product.Category.Attributes
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
                Sku = SkuFor(product.Slug, combo),
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

    public static string SkuFor(string productSlug, IEnumerable<AttributeValue> combo) =>
        string.Join('-', new[] { productSlug }.Concat(combo.Select(v => Slug.From(v.Label))).Where(s => s.Length > 0));
}
