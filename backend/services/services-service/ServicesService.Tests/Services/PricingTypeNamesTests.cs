using ServicesService.Application.Services;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services;

public class PricingTypeNamesTests
{
    [Theory]
    [InlineData("fixed", PricingType.Fixed)]
    [InlineData("variable", PricingType.Variable)]
    [InlineData("Fixed", PricingType.Fixed)]
    [InlineData("  VARIABLE ", PricingType.Variable)]
    public void ToPricingType_RecognizesTheWireNamesWhateverTheirCase(string name, PricingType expected)
    {
        PricingTypeNames.ToPricingType(name).Should().Be(expected);
        PricingTypeNames.IsKnown(name).Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("hourly")]
    [InlineData("1")]
    public void ToPricingType_WithAnUnknownName_ReturnsNull(string? name)
    {
        PricingTypeNames.ToPricingType(name).Should().BeNull();
        PricingTypeNames.IsKnown(name).Should().BeFalse();
    }

    [Theory]
    [InlineData(PricingType.Fixed, "fixed")]
    [InlineData(PricingType.Variable, "variable")]
    public void ToName_ReturnsTheCamelCaseWireName(PricingType type, string expected)
    {
        PricingTypeNames.ToName(type).Should().Be(expected);
    }

    [Fact]
    public void ToName_CoversEveryPricingType()
    {
        foreach (var type in Enum.GetValues<PricingType>())
        {
            PricingTypeNames.ToPricingType(PricingTypeNames.ToName(type)).Should().Be(type);
        }
    }

    [Fact]
    public void Unknown_NamesTheAcceptedValues()
    {
        PricingTypeNames.Unknown.Code.Should().Be("PricingType.Unknown");
        PricingTypeNames.UnknownMessage.Should().Be("A forma de cobrança deve ser uma das seguintes: fixed, variable.");
    }
}
