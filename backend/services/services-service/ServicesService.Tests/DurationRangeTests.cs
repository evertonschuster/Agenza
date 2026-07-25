using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests;

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
    public void Create_WithMinDurationBelowAllowedLimit_ReturnsFailure()
    {
        var result = DurationRange.Create(0, 30, 60);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithMaxDurationOverAllowedLimit_ReturnsFailure()
    {
        var result = DurationRange.Create(15, 30, DurationRange.MaxAllowedMinutes + 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithMinDurationGreaterThanMaxDuration_ReturnsFailure()
    {
        var result = DurationRange.Create(61, 30, 60);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithDurationOutsideMinMaxRange_ReturnsFailure()
    {
        var result = DurationRange.Create(15, 5, 60);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }
}
