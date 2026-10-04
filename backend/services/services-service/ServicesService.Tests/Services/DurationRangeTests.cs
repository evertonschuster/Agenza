using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services;

public class DurationRangeTests
{
    [Fact]
    public void Create_WithValidValues_SetsEveryProperty()
    {
        var result = DurationRange.Create(15, 30, 60);

        result.IsSuccess.Should().BeTrue();
        result.Value.MinDurationMinutes.Should().Be(15);
        result.Value.DurationMinutes.Should().Be(30);
        result.Value.MaxDurationMinutes.Should().Be(60);
    }

    [Fact]
    public void Create_AcceptsTheLimitsOfTheAllowedRange()
    {
        var result = DurationRange.Create(
            DurationRange.MinAllowedMinutes,
            DurationRange.MinAllowedMinutes,
            DurationRange.MaxAllowedMinutes);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_WithMinDurationBelowTheAllowedLimit_Fails()
    {
        var result = DurationRange.Create(0, 30, 60);

        result.Error.Code.Should().Be("DurationRange.MinOutOfRange");
    }

    [Fact]
    public void Create_WithMaxDurationOverTheAllowedLimit_Fails()
    {
        var result = DurationRange.Create(15, 30, DurationRange.MaxAllowedMinutes + 1);

        result.Error.Code.Should().Be("DurationRange.MaxOutOfRange");
    }

    [Fact]
    public void Create_WithMinDurationGreaterThanMaxDuration_Fails()
    {
        var result = DurationRange.Create(61, 30, 60);

        result.Error.Code.Should().Be("DurationRange.MinGreaterThanMax");
    }

    [Theory]
    [InlineData(5)]
    [InlineData(61)]
    public void Create_WithDurationOutsideTheRange_Fails(int duration)
    {
        var result = DurationRange.Create(15, duration, 60);

        result.Error.Code.Should().Be("DurationRange.DurationOutsideRange");
    }
}
