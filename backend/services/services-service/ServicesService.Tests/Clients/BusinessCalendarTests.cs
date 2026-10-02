using ServicesService.Application.Abstractions;

namespace ServicesService.Tests.Clients;

public class BusinessCalendarTests
{
    [Theory]
    [InlineData("2026-10-02T15:00:00Z", "2026-10-02")]
    [InlineData("2026-10-03T02:59:59Z", "2026-10-02")]
    [InlineData("2026-10-03T03:00:00Z", "2026-10-03")]
    [InlineData("2026-10-02T00:30:00Z", "2026-10-01")]
    public void GetBusinessToday_FollowsTheBrazilianCalendarDay(string utcNow, string expectedDate)
    {
        var timeProvider = new FixedTimeProvider(DateTimeOffset.Parse(utcNow, null, System.Globalization.DateTimeStyles.AssumeUniversal));

        timeProvider.GetBusinessToday().Should().Be(DateOnly.Parse(expectedDate));
    }
}
