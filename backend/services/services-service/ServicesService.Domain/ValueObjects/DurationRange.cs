using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record DurationRange
{
    public const int MinAllowedMinutes = 1;
    public const int MaxAllowedMinutes = 24 * 60;

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
            return DomainResult.Failure<DurationRange>(new DomainError(
                "Service.Invalid",
                $"A duração mínima do serviço deve ser de pelo menos {MinAllowedMinutes} minuto."));
        }

        if (maxDurationMinutes > MaxAllowedMinutes)
        {
            return DomainResult.Failure<DurationRange>(new DomainError(
                "Service.Invalid",
                $"A duração máxima do serviço não pode ultrapassar {MaxAllowedMinutes} minutos."));
        }

        if (minDurationMinutes > maxDurationMinutes)
        {
            return DomainResult.Failure<DurationRange>(new DomainError(
                "Service.Invalid",
                "A duração mínima do serviço não pode ser maior que a duração máxima."));
        }

        if (durationMinutes < minDurationMinutes || durationMinutes > maxDurationMinutes)
        {
            return DomainResult.Failure<DurationRange>(new DomainError(
                "Service.Invalid",
                "A duração do serviço deve estar entre a duração mínima e a duração máxima."));
        }

        return DomainResult.Success(new DurationRange(minDurationMinutes, durationMinutes, maxDurationMinutes));
    }
}
