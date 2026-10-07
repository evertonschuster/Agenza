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
        $"Informe ao menos um responsável para pessoas menores de {BirthDate.AdultAgeInYears} anos.");

    public static readonly DomainError AlreadyInactive = new(
        "Client.AlreadyInactive",
        "A pessoa já está inativa.");

    public static readonly DomainError AlreadyActive = new(
        "Client.AlreadyActive",
        "A pessoa já está ativa.");

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

    public static DomainResult<Client> Create(ClientData data, DateOnly today)
    {
        var contactRulesResult = ValidateContactRules(
            data.BirthDate,
            today,
            data.Guardians.Count,
            data.ReferenceContacts.Count);
        if (contactRulesResult.IsFailure)
        {
            return DomainResult.Failure<Client>(contactRulesResult.Error);
        }

        var client = new Client(
            Guid.CreateVersion7(),
            data.FullName,
            data.BirthDate,
            data.Phone,
            data.Email,
            data.Cpf,
            data.AdministrativeNotes);

        var addContactsResult = client.AddContacts(data.Guardians, data.ReferenceContacts);
        if (addContactsResult.IsFailure)
        {
            return DomainResult.Failure<Client>(addContactsResult.Error);
        }

        return DomainResult.Success(client);
    }

    public DomainResult Update(ClientData data, DateOnly today)
    {
        var contactRulesResult = ValidateContactRules(
            data.BirthDate,
            today,
            data.Guardians.Count,
            data.ReferenceContacts.Count);
        if (contactRulesResult.IsFailure)
        {
            return contactRulesResult;
        }

        var guardiansResult = CreateGuardians(data.Guardians);
        if (guardiansResult.IsFailure)
        {
            return guardiansResult;
        }

        var referenceContactsResult = CreateReferenceContacts(data.ReferenceContacts);
        if (referenceContactsResult.IsFailure)
        {
            return referenceContactsResult;
        }

        FullName = data.FullName;
        BirthDate = data.BirthDate;
        Phone = data.Phone;
        Email = data.Email;
        Cpf = data.Cpf;
        AdministrativeNotes = data.AdministrativeNotes;

        _guardians.Clear();
        _guardians.AddRange(guardiansResult.Value);
        _referenceContacts.Clear();
        _referenceContacts.AddRange(referenceContactsResult.Value);

        return DomainResult.Success();
    }

    public DomainResult Inactivate()
    {
        if (Status == ClientStatus.Inactive)
        {
            return DomainResult.Failure(AlreadyInactive);
        }

        Status = ClientStatus.Inactive;

        return DomainResult.Success();
    }

    public DomainResult Reactivate()
    {
        if (Status == ClientStatus.Active)
        {
            return DomainResult.Failure(AlreadyActive);
        }

        Status = ClientStatus.Active;

        return DomainResult.Success();
    }

    private DomainResult AddContacts(
        IReadOnlyCollection<GuardianData> guardians,
        IReadOnlyCollection<ReferenceContactData> referenceContacts)
    {
        var guardiansResult = CreateGuardians(guardians);
        if (guardiansResult.IsFailure)
        {
            return guardiansResult;
        }

        var referenceContactsResult = CreateReferenceContacts(referenceContacts);
        if (referenceContactsResult.IsFailure)
        {
            return referenceContactsResult;
        }

        _guardians.AddRange(guardiansResult.Value);
        _referenceContacts.AddRange(referenceContactsResult.Value);

        return DomainResult.Success();
    }

    private DomainResult<List<ClientGuardian>> CreateGuardians(IReadOnlyCollection<GuardianData> guardians)
    {
        var contacts = new List<ClientGuardian>();

        foreach (var data in guardians)
        {
            var guardianResult = ClientGuardian.Create(Id, data);
            if (guardianResult.IsFailure)
            {
                return DomainResult.Failure<List<ClientGuardian>>(guardianResult.Error);
            }

            contacts.Add(guardianResult.Value);
        }

        return DomainResult.Success(contacts);
    }

    private DomainResult<List<ClientReferenceContact>> CreateReferenceContacts(
        IReadOnlyCollection<ReferenceContactData> referenceContacts)
    {
        var contacts = new List<ClientReferenceContact>();

        foreach (var data in referenceContacts)
        {
            var contactResult = ClientReferenceContact.Create(Id, data);
            if (contactResult.IsFailure)
            {
                return DomainResult.Failure<List<ClientReferenceContact>>(contactResult.Error);
            }

            contacts.Add(contactResult.Value);
        }

        return DomainResult.Success(contacts);
    }

    private static DomainResult ValidateContactRules(
        BirthDate? birthDate,
        DateOnly today,
        int guardianCount,
        int referenceContactCount)
    {
        if (guardianCount > MaxGuardians)
        {
            return DomainResult.Failure(TooManyGuardians);
        }

        if (referenceContactCount > MaxReferenceContacts)
        {
            return DomainResult.Failure(TooManyReferenceContacts);
        }

        if (birthDate is not null && birthDate.IsMinorOn(today) && guardianCount == 0)
        {
            return DomainResult.Failure(GuardianRequired);
        }

        return DomainResult.Success();
    }
}
