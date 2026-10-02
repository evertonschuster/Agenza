namespace ServicesService.Application.Abstractions;

public static class BusinessCalendar
{
    private static readonly TimeZoneInfo BusinessTimeZone = ResolveBusinessTimeZone();

    public static DateOnly GetBusinessToday(this TimeProvider timeProvider) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(timeProvider.GetUtcNow(), BusinessTimeZone).DateTime);

    // Brazil has no daylight saving time since 2019, so the fixed offset is the safe fallback when tzdata is missing.
    private static TimeZoneInfo ResolveBusinessTimeZone()
    {
        foreach (var id in new[] { "America/Sao_Paulo", "E. South America Standard Time" })
        {
            if (TimeZoneInfo.TryFindSystemTimeZoneById(id, out var timeZone))
            {
                return timeZone;
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone("BRT", TimeSpan.FromHours(-3), "BRT", "BRT");
    }
}
