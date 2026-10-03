using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

// CPF and e-mail uniqueness per tenant are cross-aggregate rules, enforced in the use cases via IClientRepository
// and backed by unique indexes (ClientConfiguration), not here.
public class Client : TenantOwnedEntity
{
    public const int MaxGuardians = 10;
    public const int MaxReferenceContacts = 10;

    public static readonly DomainError TooManyGuardians = new(
        "Client.TooManyGuardians",
        $"Informe no máximo {MaxGuardians} responsáveis.");

    public static readonly DomainError TooManyReferenceContacts = new(
        "Client.TooManyReferenceContacts",
        $"Informe no máximo {MaxReferenceContacts} pessoas de referência.");

    public static readonly DomainError GuardianRequired = new(
        "Client.GuardianRequired",
        $"Informe ao menos um responsável para pessoas menores de {ValueObjects.BirthDate.AdultAgeInYears} anos.");

    public FullName FullName { get; private set; }
    public BirthDate? BirthDate { get; private set; }
    public PhoneNumber? Phone { get; private set; }
    public EmailAddress? Email { get; private set; }
    public CpfNumber? Cpf { get; private set; }
    public AdministrativeNotes? AdministrativeNotes { get; private set; }
    public ClientStatus Status { get; private set; }

    private readonly List<ClientGuardian> _guardians = [];
    public IReadOnlyCollection<ClientGuardian> Guardians => _guardians;

    private readonly List<ClientReferenceContact> _referenceContacts = [];
    public IReadOnlyCollection<ClientReferenceContact> ReferenceContacts => _referenceContacts;

    // EF Core materialization only.
    private Client()
    {
        FullName = null!;
    }

    private Client(
        Guid id,
        FullName fullName,
        BirthDate? birthDate,
        PhoneNumber? phone,
        EmailAddress? email,
        CpfNumber? cpf,
        AdministrativeNotes? administrativeNotes)
        : base(id)
    {
        FullName = fullName;
        BirthDate = birthDate;
        Phone = phone;
        Email = email;
        Cpf = cpf;
        AdministrativeNotes = administrativeNotes;
        Status = ClientStatus.Active;
    }

    public static DomainResult<Client> Create(
        Guid id,
        FullName fullName,
        BirthDate? birthDate,
        PhoneNumber? phone,
        EmailAddress? email,
        CpfNumber? cpf,
        AdministrativeNotes? administrativeNotes,
        DateOnly today,
        IReadOnlyCollection<GuardianData> guardians,
        IReadOnlyCollection<ReferenceContactData> referenceContacts)
    {
        var guardiansResult = ValidateGuardians(birthDate?.Value, today, guardians.Count);
        if (guardiansResult.IsFailure)
        {
            return DomainResult.Failure<Client>(guardiansResult.Error);
        }

        var referenceContactsResult = ValidateReferenceContacts(referenceContacts.Count);
        if (referenceContactsResult.IsFailure)
        {
            return DomainResult.Failure<Client>(referenceContactsResult.Error);
        }

        var client = new Client(id, fullName, birthDate, phone, email, cpf, administrativeNotes);

        var contactsResult = client.AddContacts(guardians, referenceContacts);
        if (contactsResult.IsFailure)
        {
            return DomainResult.Failure<Client>(contactsResult.Error);
        }

        return DomainResult.Success(client);
    }

    private DomainResult AddContacts(
        IReadOnlyCollection<GuardianData> guardians,
        IReadOnlyCollection<ReferenceContactData> referenceContacts)
    {
        foreach (var data in guardians)
        {
            var guardianResult = ClientGuardian.Create(Guid.CreateVersion7(), Id, data);
            if (guardianResult.IsFailure)
            {
                return DomainResult.Failure(guardianResult.Error);
            }

            _guardians.Add(guardianResult.Value);
        }

        foreach (var data in referenceContacts)
        {
            var referenceContactResult = ClientReferenceContact.Create(Guid.CreateVersion7(), Id, data);
            if (referenceContactResult.IsFailure)
            {
                return DomainResult.Failure(referenceContactResult.Error);
            }

            _referenceContacts.Add(referenceContactResult.Value);
        }

        return DomainResult.Success();
    }

    public static DomainResult ValidateGuardians(DateOnly? birthDate, DateOnly today, int guardianCount)
    {
        if (guardianCount > MaxGuardians)
        {
            return DomainResult.Failure(TooManyGuardians);
        }

        if (birthDate is { } date && ValueObjects.BirthDate.IsMinorOn(date, today) && guardianCount == 0)
        {
            return DomainResult.Failure(GuardianRequired);
        }

        return DomainResult.Success();
    }

    public static DomainResult ValidateReferenceContacts(int referenceContactCount)
    {
        if (referenceContactCount > MaxReferenceContacts)
        {
            return DomainResult.Failure(TooManyReferenceContacts);
        }

        return DomainResult.Success();
    }
}
