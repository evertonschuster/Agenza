using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record ServiceDuration
{
    public const int MinAllowedMinutes = 1;
    public const int MinBufferMinutes = 0;
    public const int MaxAllowedMinutes = 24 * 60;

    public static readonly DomainError DurationOutOfRange = new(
        "ServiceDuration.DurationOutOfRange",
        $"A duração deve ser de {MinAllowedMinutes} a {MaxAllowedMinutes} minutos.");

    public static readonly DomainError PreparationOutOfRange = new(
        "ServiceDuration.PreparationOutOfRange",
        $"O tempo de preparo deve ser de {MinBufferMinutes} a {MaxAllowedMinutes} minutos.");

    public static readonly DomainError CleanupOutOfRange = new(
        "ServiceDuration.CleanupOutOfRange",
        $"O tempo de limpeza deve ser de {MinBufferMinutes} a {MaxAllowedMinutes} minutos.");

    public static readonly DomainError MinOutOfRange = new(
        "ServiceDuration.MinOutOfRange",
        $"A duração mínima deve ser de {MinAllowedMinutes} a {MaxAllowedMinutes} minutos.");

    public static readonly DomainError MaxOutOfRange = new(
        "ServiceDuration.MaxOutOfRange",
        $"A duração máxima deve ser de {MinAllowedMinutes} a {MaxAllowedMinutes} minutos.");

    public static readonly DomainError MinGreaterThanMax = new(
        "ServiceDuration.MinGreaterThanMax",
        "A duração mínima não pode ser maior que a duração máxima.");

    public static readonly DomainError DurationBelowMin = new(
        "ServiceDuration.DurationBelowMin",
        "A duração não pode ser menor que a duração mínima.");

    public static readonly DomainError DurationAboveMax = new(
        "ServiceDuration.DurationAboveMax",
        "A duração não pode ser maior que a duração máxima.");

    public int DurationMinutes { get; }
    public int PreparationMinutes { get; }
    public int CleanupMinutes { get; }
    public int? MinDurationMinutes { get; }
    public int? MaxDurationMinutes { get; }

    private ServiceDuration(
        int durationMinutes,
        int preparationMinutes,
        int cleanupMinutes,
        int? minDurationMinutes,
        int? maxDurationMinutes)
    {
        DurationMinutes = durationMinutes;
        PreparationMinutes = preparationMinutes;
        CleanupMinutes = cleanupMinutes;
        MinDurationMinutes = minDurationMinutes;
        MaxDurationMinutes = maxDurationMinutes;
    }

    public static DomainResult<ServiceDuration> Create(
        int durationMinutes,
        int preparationMinutes,
        int cleanupMinutes,
        int? minDurationMinutes,
        int? maxDurationMinutes)
    {
        if (!IsAllowedDuration(durationMinutes))
        {
            return DomainResult.Failure<ServiceDuration>(DurationOutOfRange);
        }

        if (!IsAllowedBuffer(preparationMinutes))
        {
            return DomainResult.Failure<ServiceDuration>(PreparationOutOfRange);
        }

        if (!IsAllowedBuffer(cleanupMinutes))
        {
            return DomainResult.Failure<ServiceDuration>(CleanupOutOfRange);
        }

        if (minDurationMinutes is { } minimum && !IsAllowedDuration(minimum))
        {
            return DomainResult.Failure<ServiceDuration>(MinOutOfRange);
        }

        if (maxDurationMinutes is { } maximum && !IsAllowedDuration(maximum))
        {
            return DomainResult.Failure<ServiceDuration>(MaxOutOfRange);
        }

        if (minDurationMinutes is { } lowest && maxDurationMinutes is { } highest && lowest > highest)
        {
            return DomainResult.Failure<ServiceDuration>(MinGreaterThanMax);
        }

        if (minDurationMinutes is { } floor && durationMinutes < floor)
        {
            return DomainResult.Failure<ServiceDuration>(DurationBelowMin);
        }

        if (maxDurationMinutes is { } ceiling && durationMinutes > ceiling)
        {
            return DomainResult.Failure<ServiceDuration>(DurationAboveMax);
        }

        return DomainResult.Success(new ServiceDuration(
            durationMinutes,
            preparationMinutes,
            cleanupMinutes,
            minDurationMinutes,
            maxDurationMinutes));
    }

    public static bool IsAllowedDuration(int minutes)
    {
        return minutes >= MinAllowedMinutes && minutes <= MaxAllowedMinutes;
    }

    public static bool IsAllowedBuffer(int minutes)
    {
        return minutes >= MinBufferMinutes && minutes <= MaxAllowedMinutes;
    }
}
