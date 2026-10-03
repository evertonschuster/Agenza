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
        IReadOnlyCollection<ClientGuardian> guardians,
        IReadOnlyCollection<ClientReferenceContact> referenceContacts)
    {
        var contactsResult = ValidateContacts(birthDate, today, guardians, referenceContacts);
        if (contactsResult.IsFailure)
        {
            return DomainResult.Failure<Client>(contactsResult.Error);
        }

        var client = new Client(id, fullName, birthDate, phone, email, cpf, administrativeNotes);
        client.AddContacts(guardians, referenceContacts);

        return DomainResult.Success(client);
    }

    private void AddContacts(
        IReadOnlyCollection<ClientGuardian> guardians,
        IReadOnlyCollection<ClientReferenceContact> referenceContacts)
    {
        foreach (var guardian in guardians)
        {
            guardian.AssignClient(Id);
            _guardians.Add(guardian);
        }

        foreach (var referenceContact in referenceContacts)
        {
            referenceContact.AssignClient(Id);
            _referenceContacts.Add(referenceContact);
        }
    }

    private static DomainResult ValidateContacts(
        BirthDate? birthDate,
        DateOnly today,
        IReadOnlyCollection<ClientGuardian> guardians,
        IReadOnlyCollection<ClientReferenceContact> referenceContacts)
    {
        if (guardians.Count > MaxGuardians)
        {
            return DomainResult.Failure(TooManyGuardians);
        }

        if (referenceContacts.Count > MaxReferenceContacts)
        {
            return DomainResult.Failure(TooManyReferenceContacts);
        }

        if (birthDate is not null && birthDate.IsMinorOn(today) && guardians.Count == 0)
        {
            return DomainResult.Failure(GuardianRequired);
        }

        return DomainResult.Success();
    }
}
