using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record DurationRange
{
    public const int MinAllowedMinutes = 1;
    public const int MaxAllowedMinutes = 24 * 60;

    public static readonly DomainError MinOutOfRange = new(
        "DurationRange.MinOutOfRange",
        $"A duração mínima deve ser de pelo menos {MinAllowedMinutes} minuto.");

    public static readonly DomainError MaxOutOfRange = new(
        "DurationRange.MaxOutOfRange",
        $"A duração máxima não pode ultrapassar {MaxAllowedMinutes} minutos.");

    public static readonly DomainError MinGreaterThanMax = new(
        "DurationRange.MinGreaterThanMax",
        "A duração mínima não pode ser maior que a duração máxima.");

    public static readonly DomainError DurationOutsideRange = new(
        "DurationRange.DurationOutsideRange",
        "A duração deve estar entre a duração mínima e a duração máxima.");

    public int MinDurationMinutes { get; }
    public int DurationMinutes { get; }
    public int MaxDurationMinutes { get; }

    private DurationRange(int minDurationMinutes, int durationMinutes, int maxDurationMinutes)
    {
        MinDurationMinutes = minDurationMinutes;
        DurationMinutes = durationMinutes;
        MaxDurationMinutes = maxDurationMinutes;
    }

    public static DomainResult<DurationRange> Create(int minDurationMinutes, int durationMinutes, int maxDurationMinutes)
    {
        if (minDurationMinutes < MinAllowedMinutes)
        {
            return DomainResult.Failure<DurationRange>(MinOutOfRange);
        }

        if (maxDurationMinutes > MaxAllowedMinutes)
        {
            return DomainResult.Failure<DurationRange>(MaxOutOfRange);
        }

        if (minDurationMinutes > maxDurationMinutes)
        {
            return DomainResult.Failure<DurationRange>(MinGreaterThanMax);
        }

        if (durationMinutes < minDurationMinutes || durationMinutes > maxDurationMinutes)
        {
            return DomainResult.Failure<DurationRange>(DurationOutsideRange);
        }

        return DomainResult.Success(new DurationRange(minDurationMinutes, durationMinutes, maxDurationMinutes));
    }
}
