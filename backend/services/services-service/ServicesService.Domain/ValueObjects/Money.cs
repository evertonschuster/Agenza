using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record Money
{
    public const int Precision = 10;
    public const int Scale = 2;
    public const decimal MaxValue = 99_999_999.99m;

    public static readonly DomainError Negative = new("Money.Negative", "O valor não pode ser negativo.");

    public static readonly DomainError InvalidPrecision = new(
        "Money.InvalidPrecision",
        $"O valor deve ter no máximo {Precision - Scale} dígitos inteiros e {Scale} casas decimais.");

    public decimal Value { get; }

    private Money(decimal value)
    {
        Value = value;
    }

    public static DomainResult<Money> Create(decimal raw)
    {
        if (raw < 0)
        {
            return DomainResult.Failure<Money>(Negative);
        }

        if (!HasValidPrecision(raw))
        {
            return DomainResult.Failure<Money>(InvalidPrecision);
        }

        return DomainResult.Success(new Money(raw));
    }

    public static Money Restore(decimal value)
    {
        return new Money(value);
    }

    public static bool HasValidPrecision(decimal value)
    {
        return decimal.Round(value, Scale) == value && Math.Abs(value) <= MaxValue;
    }
}
