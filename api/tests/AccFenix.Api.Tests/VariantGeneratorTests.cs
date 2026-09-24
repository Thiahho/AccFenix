using AccFenix.Api.Domain;
using AccFenix.Api.Services;
using FluentAssertions;

namespace AccFenix.Api.Tests;

public class VariantGeneratorTests
{
    [Fact]
    public void Combine_returns_cartesian_product()
    {
        var result = VariantGenerator.Combine<string>([["1.20", "1.40"], ["22", "34"], ["Natural", "Caoba", "Cedro"]]);

        result.Should().HaveCount(12);
        result.Select(c => string.Join('/', c)).Should().OnlyHaveUniqueItems()
            .And.Contain("1.40/34/Cedro");
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
        AttributeValue[] combo = [new() { Label = "2.40" }, new() { Label = "34" }, new() { Label = "Caoba" }];

        VariantGenerator.SkuFor("barral", combo).Should().Be("barral-2-40-34-caoba");
    }

    [Theory]
    [InlineData("Soporte Bocha", "soporte-bocha")]
    [InlineData("Kit 1.20 a 1.60 Doble", "kit-1-20-a-1-60-doble")]
    [InlineData("  Versión  ", "version")]
    public void Slug_normalizes_text(string input, string expected)
    {
        Slug.From(input).Should().Be(expected);
    }
}
