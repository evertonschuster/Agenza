using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record Percentage
{
    public const decimal Minimum = 0m;
    public const decimal Maximum = 100m;
    public const int Precision = 5;
    public const int Scale = 2;

    public static readonly DomainError OutOfRange = new(
        "Percentage.OutOfRange",
        $"O percentual deve ficar entre {Minimum} e {Maximum}.");

    public static readonly DomainError TooManyDecimals = new(
        "Percentage.TooManyDecimals",
        $"O percentual deve ter no máximo {Scale} casas decimais.");

    public decimal Value { get; }

    private Percentage(decimal value)
    {
        Value = value;
    }

    public static DomainResult<Percentage?> Create(decimal? raw)
    {
        if (raw is not { } value)
        {
            return DomainResult.Success<Percentage?>(null);
        }

        if (!IsInRange(value))
        {
            return DomainResult.Failure<Percentage?>(OutOfRange);
        }

        if (!HasValidScale(value))
        {
            return DomainResult.Failure<Percentage?>(TooManyDecimals);
        }

        return DomainResult.Success<Percentage?>(new Percentage(value));
    }

    public static Percentage Restore(decimal value)
    {
        return new Percentage(value);
    }

    public static bool IsInRange(decimal value)
    {
        return value >= Minimum && value <= Maximum;
    }

    public static bool HasValidScale(decimal value)
    {
        return decimal.Round(value, Scale) == value;
    }
}
