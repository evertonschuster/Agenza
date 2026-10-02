using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

public static class BirthDateRules
{
    public const int AdultAgeInYears = 18;
    public const int MaxAgeInYears = 120;

    public static int AgeOn(DateOnly birthDate, DateOnly today)
    {
        var age = today.Year - birthDate.Year;
        return birthDate.AddYears(age) > today ? age - 1 : age;
    }

    public static bool IsInThePast(DateOnly birthDate, DateOnly today) => birthDate < today;

    public static bool IsWithinMaxAge(DateOnly birthDate, DateOnly today) => AgeOn(birthDate, today) <= MaxAgeInYears;

    public static bool IsMinorOn(DateOnly birthDate, DateOnly today) =>
        IsInThePast(birthDate, today) && AgeOn(birthDate, today) < AdultAgeInYears;

    public static DomainResult Validate(DateOnly birthDate, DateOnly today)
    {
        if (!IsInThePast(birthDate, today))
        {
            return DomainResult.Failure(new DomainError("Client.Invalid", "A data de nascimento deve estar no passado."));
        }

        if (!IsWithinMaxAge(birthDate, today))
        {
            return DomainResult.Failure(new DomainError(
                "Client.Invalid",
                $"A data de nascimento não pode indicar idade superior a {MaxAgeInYears} anos."));
        }

        return DomainResult.Success();
    }
}
