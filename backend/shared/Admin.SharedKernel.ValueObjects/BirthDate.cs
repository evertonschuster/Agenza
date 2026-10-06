namespace Admin.SharedKernel.ValueObjects;

public sealed record BirthDate : IDateValueObject<BirthDate>
{
    public const int AdultAgeInYears = 18;
    public const int MaxAgeInYears = 120;

    private const string NotInThePast = "A data de nascimento deve estar no passado.";

    private static readonly string TooOld =
        $"A data de nascimento não pode indicar idade superior a {MaxAgeInYears} anos.";

    public DateOnly Value { get; }

    private BirthDate(DateOnly value)
    {
        Value = value;
    }

    public static ParseResult<BirthDate> Create(DateOnly value, DateOnly today)
    {
        if (value >= today)
        {
            return ParseResult<BirthDate>.Failure(NotInThePast);
        }

        if (AgeOn(value, today) > MaxAgeInYears)
        {
            return ParseResult<BirthDate>.Failure(TooOld);
        }

        return ParseResult<BirthDate>.Success(new BirthDate(value));
    }

    // Both rules depend on the day they are checked, so a stored birth date is restored without them: a person
    // registered at 119 must still load years later.
    public static BirthDate Restore(DateOnly value)
    {
        return new BirthDate(value);
    }

    public bool IsMinorOn(DateOnly today)
    {
        return Value < today && AgeOn(Value, today) < AdultAgeInYears;
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
}
