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
    public void SkuFor_joins_product_slug_and_value_labels()
    {
        AttributeValue[] combo = [new() { Label = "Colorado" }, new() { Label = "Medio cajón" }];

        VariantGenerator.SkuFor("huevos-n-1", combo).Should().Be("huevos-n-1-colorado-medio-cajon");
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
