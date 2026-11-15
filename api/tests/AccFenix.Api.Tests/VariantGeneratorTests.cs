using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentAssertions;

namespace AccFenix.Api.Tests;

public class VariantGeneratorTests
{
    [Fact]
    public void Combine_returns_cartesian_product()
    {
        var result = VariantGenerator.Combine<string>([["Blanco", "Colorado"], ["N°1", "N°2"], ["Cajón", "Medio cajón", "Maple"]]);

        result.Should().HaveCount(12);
        result.Select(c => string.Join('/', c)).Should().OnlyHaveUniqueItems()
            .And.Contain("Colorado/N°2/Maple");
    }

    [Fact]
    public void Combine_without_groups_returns_single_empty_combination()
    {
        VariantGenerator.Combine<string>([]).Should().ContainSingle().Which.Should().BeEmpty();
    }

    [Fact]
    public void KeyFor_is_order_independent()
    {
        VariantGenerator.KeyFor([7, 2, 5]).Should().Be("2-5-7").And.Be(VariantGenerator.KeyFor([5, 7, 2]));
    }

    [Fact]
    public void SkuFor_joins_product_id_slug_and_value_labels()
    {
        AttributeValue[] combo = [new() { Label = "Colorado" }, new() { Label = "Medio cajón" }];

        VariantGenerator.SkuFor(42, "huevos-n-1", combo).Should().Be("42-huevos-n-1-colorado-medio-cajon");
    }

    [Fact]
    public void SkuFor_differs_between_products_with_the_same_slug()
    {
        AttributeValue[] combo = [new() { Label = "Colorado" }];

        VariantGenerator.SkuFor(1, "huevos", combo).Should().NotBe(VariantGenerator.SkuFor(2, "huevos", combo));
    }

    [Fact]
    public void SkuFor_caps_long_values_to_the_column_length_deterministically()
    {
        var slug = new string('a', 180);
        AttributeValue[] combo = [new() { Label = new string('b', 80) }, new() { Label = new string('c', 80) }];
        AttributeValue[] other = [new() { Label = new string('b', 80) }, new() { Label = new string('d', 80) }];

        var sku = VariantGenerator.SkuFor(7, slug, combo);

        sku.Length.Should().BeLessOrEqualTo(Variant.SkuMaxLength);
        sku.Should().StartWith("7-aaa").And.MatchRegex("-[0-9a-f]{8}$");
        VariantGenerator.SkuFor(7, slug, combo).Should().Be(sku);
        // Same 111-char prefix, different tail: the hash keeps them apart.
        VariantGenerator.SkuFor(7, slug, other).Should().NotBe(sku);
    }

    [Fact]
    public void SkuFor_keeps_values_that_fit_unchanged()
    {
        var slug = new string('a', Variant.SkuMaxLength - 2);

        VariantGenerator.SkuFor(7, slug, []).Should().Be($"7-{slug}").And.HaveLength(Variant.SkuMaxLength);
    }

    [Theory]
    [InlineData("Huevos N°1", "huevos-n-1")]
    [InlineData("Maple x 30 (1.5 kg)", "maple-x-30-1-5-kg")]
    [InlineData("  Versión  ", "version")]
    public void Slug_normalizes_text(string input, string expected)
    {
        Slug.From(input).Should().Be(expected);
    }
}
