namespace ServicesService.Tests.Clients;

internal static class ClientTestData
{
    public static readonly DateOnly Today = new(2026, 10, 2);

    public const string ValidCpf = "529.982.247-25";
    public const string ValidCpfDigits = "52998224725";
    public const string OtherValidCpf = "123.456.789-09";

    public static FullName Name(string value = "Maria Souza")
    {
        return FullName.Create(value).Value;
    }

    public static AdministrativeNotes Notes(string value = "Prefere atendimento à tarde.")
    {
        return AdministrativeNotes.Create(value).Value;
    }

    public static BirthDate? Birth(DateOnly? date)
    {
        return date is null ? null : BirthDate.Create(date.Value, Today).Value;
    }

    public static CpfNumber Cpf(string value = ValidCpf)
    {
        return CpfNumber.Create(value).Value;
    }

    public static EmailAddress Email(string value = "maria@example.com")
    {
        return EmailAddress.Create(value).Value;
    }

    public static PhoneNumber Phone(string value = "(11) 99999-0000")
    {
        return PhoneNumber.Create(value).Value;
    }

    public static GuardianData Guardian(string name = "Ana Souza", string relationship = "Mãe")
    {
        return new GuardianData(name, relationship, null, null);
    }

    public static IReadOnlySet<ContactPurpose> Purposes(params ContactPurpose[] purposes)
    {
        return new HashSet<ContactPurpose>(purposes);
    }

    public static ReferenceContactData ReferenceContact(params ContactPurpose[] purposes)
    {
        return new ReferenceContactData(
            Name("Carlos Lima"),
            "Tio",
            null,
            Purposes(purposes.Length == 0 ? [ContactPurpose.Emergency] : purposes));
    }

    public static ClientData Data(
        FullName? fullName = null,
        BirthDate? birthDate = null,
        PhoneNumber? phone = null,
        EmailAddress? email = null,
        CpfNumber? cpf = null,
        AdministrativeNotes? notes = null,
        IReadOnlyCollection<GuardianData>? guardians = null,
        IReadOnlyCollection<ReferenceContactData>? referenceContacts = null)
    {
        return new ClientData(fullName ?? Name(), birthDate, phone, email, cpf, notes, guardians ?? [], referenceContacts ?? []);
    }

    public static Client ExistingClient()
    {
        return Client.Create(Data(Name("Paula Rocha"), cpf: Cpf()), Today).Value;
    }
}

internal sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => utcNow;
}
