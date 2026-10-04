using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services;

public class MoneyTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(0.01)]
    [InlineData(45.5)]
    [InlineData(99999999.99)]
    public void Create_WithValidAmount_KeepsIt(double amount)
    {
        var result = Money.Create((decimal)amount);

        result.IsSuccess.Should().BeTrue();
        result.Value.Value.Should().Be((decimal)amount);
    }

    [Fact]
    public void Create_IgnoresTrailingZeros()
    {
        Money.Create(45.500m).Value.Should().Be(Money.Create(45.5m).Value);
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(-45)]
    public void Create_WithNegativeAmount_Fails(double amount)
    {
        var result = Money.Create((decimal)amount);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Money.Negative");
    }

    [Theory]
    [InlineData("45.123")]
    [InlineData("100000000")]
    [InlineData("99999999.995")]
    public void Create_WithMoreThanTheStoredPrecision_Fails(string amount)
    {
        var result = Money.Create(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Money.InvalidPrecision");
    }

    [Fact]
    public void HasValidPrecision_AgreesWithCreate()
    {
        Money.HasValidPrecision(45.5m).Should().BeTrue();
        Money.HasValidPrecision(45.123m).Should().BeFalse();
        Money.HasValidPrecision(Money.MaxValue).Should().BeTrue();
        Money.HasValidPrecision(Money.MaxValue + 0.01m).Should().BeFalse();
    }

    [Fact]
    public void Restore_AcceptsAnAmountThatCreateWouldReject()
    {
        Money.Restore(-1m).Value.Should().Be(-1m);
    }
}
