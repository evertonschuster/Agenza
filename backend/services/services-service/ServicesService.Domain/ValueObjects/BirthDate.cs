using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public sealed record BirthDate
{
    public const int AdultAgeInYears = 18;
    public const int MaxAgeInYears = 120;

    public static readonly DomainError NotInThePast = new(
        "BirthDate.NotInThePast",
        "A data de nascimento deve estar no passado.");

    public static readonly DomainError TooOld = new(
        "BirthDate.TooOld",
        $"A data de nascimento não pode indicar idade superior a {MaxAgeInYears} anos.");

    public DateOnly Value { get; }

    private BirthDate(DateOnly value)
    {
        Value = value;
    }

    public static DomainResult<BirthDate?> Create(DateOnly? value, DateOnly today)
    {
        if (value is not { } date)
        {
            return DomainResult.Success<BirthDate?>(null);
        }

        if (!IsInThePast(date, today))
        {
            return DomainResult.Failure<BirthDate?>(NotInThePast);
        }

        if (!IsWithinMaxAge(date, today))
        {
            return DomainResult.Failure<BirthDate?>(TooOld);
        }

        return DomainResult.Success<BirthDate?>(new BirthDate(date));
    }

    // Both rules depend on the day they are checked, so a stored birth date is restored without them: a person
    // registered at 119 must still load years later.
    public static BirthDate Restore(DateOnly value)
    {
        return new BirthDate(value);
    }

    public bool IsMinorOn(DateOnly today)
    {
        return IsMinorOn(Value, today);
    }

    public static int AgeOn(DateOnly birthDate, DateOnly today)
    {
        var age = today.Year - birthDate.Year;
        if (birthDate.AddYears(age) > today)
        {
            return age - 1;
        }

        return age;
    }

    private static bool IsInThePast(DateOnly birthDate, DateOnly today)
    {
        return birthDate < today;
    }

    private static bool IsWithinMaxAge(DateOnly birthDate, DateOnly today)
    {
        return AgeOn(birthDate, today) <= MaxAgeInYears;
    }

    public static bool IsMinorOn(DateOnly birthDate, DateOnly today)
    {
        if (!IsInThePast(birthDate, today))
        {
            return false;
        }

        return AgeOn(birthDate, today) < AdultAgeInYears;
    }
}
