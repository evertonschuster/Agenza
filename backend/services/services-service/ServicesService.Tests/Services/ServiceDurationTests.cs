using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services;

public class ServiceDurationTests
{
    [Fact]
    public void Create_WithEveryValue_KeepsThem()
    {
        var result = ServiceDuration.Create(30, 10, 5, 15, 60);

        result.IsSuccess.Should().BeTrue();
        result.Value.DurationMinutes.Should().Be(30);
        result.Value.PreparationMinutes.Should().Be(10);
        result.Value.CleanupMinutes.Should().Be(5);
        result.Value.MinDurationMinutes.Should().Be(15);
        result.Value.MaxDurationMinutes.Should().Be(60);
    }

    [Fact]
    public void Create_WithoutLimits_KeepsThemNull()
    {
        var result = ServiceDuration.Create(30, 0, 0, null, null);

        result.IsSuccess.Should().BeTrue();
        result.Value.MinDurationMinutes.Should().BeNull();
        result.Value.MaxDurationMinutes.Should().BeNull();
    }

    [Fact]
    public void Create_AcceptsTheEdgesOfTheAllowedRange()
    {
        ServiceDuration.Create(ServiceDuration.MinAllowedMinutes, ServiceDuration.MinBufferMinutes, ServiceDuration.MinBufferMinutes, null, null)
            .IsSuccess.Should().BeTrue();
        ServiceDuration.Create(
                ServiceDuration.MaxAllowedMinutes,
                ServiceDuration.MaxAllowedMinutes,
                ServiceDuration.MaxAllowedMinutes,
                ServiceDuration.MinAllowedMinutes,
                ServiceDuration.MaxAllowedMinutes)
            .IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_AcceptsAMinimumAndAMaximumEqualToTheDuration()
    {
        ServiceDuration.Create(30, 0, 0, 30, 30).IsSuccess.Should().BeTrue();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(1441)]
    public void Create_WithDurationOutOfRange_Fails(int duration)
    {
        ServiceDuration.Create(duration, 0, 0, null, null).Error.Code.Should().Be("ServiceDuration.DurationOutOfRange");
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1441)]
    public void Create_WithPreparationOutOfRange_Fails(int preparation)
    {
        ServiceDuration.Create(30, preparation, 0, null, null).Error.Code.Should().Be("ServiceDuration.PreparationOutOfRange");
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1441)]
    public void Create_WithCleanupOutOfRange_Fails(int cleanup)
    {
        ServiceDuration.Create(30, 0, cleanup, null, null).Error.Code.Should().Be("ServiceDuration.CleanupOutOfRange");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1441)]
    public void Create_WithMinimumOutOfRange_Fails(int minimum)
    {
        ServiceDuration.Create(30, 0, 0, minimum, null).Error.Code.Should().Be("ServiceDuration.MinOutOfRange");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1441)]
    public void Create_WithMaximumOutOfRange_Fails(int maximum)
    {
        ServiceDuration.Create(30, 0, 0, null, maximum).Error.Code.Should().Be("ServiceDuration.MaxOutOfRange");
    }

    [Fact]
    public void Create_WithMinimumGreaterThanMaximum_Fails()
    {
        ServiceDuration.Create(30, 0, 0, 61, 60).Error.Code.Should().Be("ServiceDuration.MinGreaterThanMax");
    }

    [Fact]
    public void Create_WithDurationBelowTheMinimum_Fails()
    {
        ServiceDuration.Create(5, 0, 0, 15, null).Error.Code.Should().Be("ServiceDuration.DurationBelowMin");
    }

    [Fact]
    public void Create_WithDurationAboveTheMaximum_Fails()
    {
        ServiceDuration.Create(61, 0, 0, null, 60).Error.Code.Should().Be("ServiceDuration.DurationAboveMax");
    }

    [Fact]
    public void Create_ReportsTheFirstBrokenRule()
    {
        var result = ServiceDuration.Create(0, -1, -1, 0, 0);

        result.Error.Code.Should().Be("ServiceDuration.DurationOutOfRange");
    }

    [Fact]
    public void Predicates_AgreeWithCreate()
    {
        ServiceDuration.IsAllowedDuration(1).Should().BeTrue();
        ServiceDuration.IsAllowedDuration(0).Should().BeFalse();
        ServiceDuration.IsAllowedDuration(1441).Should().BeFalse();
        ServiceDuration.IsAllowedBuffer(0).Should().BeTrue();
        ServiceDuration.IsAllowedBuffer(-1).Should().BeFalse();
        ServiceDuration.IsAllowedBuffer(1441).Should().BeFalse();
    }
}
