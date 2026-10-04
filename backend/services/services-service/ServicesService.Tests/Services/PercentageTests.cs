using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services;

public class PercentageTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(12.34)]
    [InlineData(100)]
    public void Create_WithValueInRange_KeepsIt(double value)
    {
        var result = Percentage.Create((decimal)value);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Value.Should().Be((decimal)value);
    }

    [Fact]
    public void Create_WithoutAValue_ReturnsNull()
    {
        var result = Percentage.Create(null);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeNull();
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(100.01)]
    public void Create_WithValueOutOfRange_Fails(double value)
    {
        var result = Percentage.Create((decimal)value);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Percentage.OutOfRange");
    }

    [Fact]
    public void Create_WithMoreThanTwoDecimals_Fails()
    {
        var result = Percentage.Create(12.345m);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Percentage.TooManyDecimals");
    }

    [Fact]
    public void Predicates_AgreeWithCreate()
    {
        Percentage.IsInRange(100m).Should().BeTrue();
        Percentage.IsInRange(100.01m).Should().BeFalse();
        Percentage.HasValidScale(12.34m).Should().BeTrue();
        Percentage.HasValidScale(12.345m).Should().BeFalse();
    }

    [Fact]
    public void Restore_AcceptsAValueThatCreateWouldReject()
    {
        Percentage.Restore(150m).Value.Should().Be(150m);
    }
}
