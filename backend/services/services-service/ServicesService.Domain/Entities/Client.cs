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

    public static readonly DomainError ContactNotFound = new(
        "Client.ContactNotFound",
        "Um dos contatos informados não foi encontrado neste cadastro.");

    public static readonly DomainError DuplicateContact = new(
        "Client.DuplicateContact",
        "O mesmo contato foi informado mais de uma vez.");

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
        var contactRulesResult = ValidateContactRules(birthDate, today, guardians.Count, referenceContacts.Count);
        if (contactRulesResult.IsFailure)
        {
            return DomainResult.Failure<Client>(contactRulesResult.Error);
        }

        var client = new Client(id, fullName, birthDate, phone, email, cpf, administrativeNotes);

        var addContactsResult = client.AddContacts(guardians, referenceContacts);
        if (addContactsResult.IsFailure)
        {
            return DomainResult.Failure<Client>(addContactsResult.Error);
        }

        return DomainResult.Success(client);
    }

    public DomainResult Update(
        FullName fullName,
        BirthDate? birthDate,
        PhoneNumber? phone,
        EmailAddress? email,
        CpfNumber? cpf,
        AdministrativeNotes? administrativeNotes,
        DateOnly today,
        IReadOnlyCollection<ContactChange<GuardianData>> guardians,
        IReadOnlyCollection<ContactChange<ReferenceContactData>> referenceContacts)
    {
        var contactRulesResult = ValidateContactRules(birthDate, today, guardians.Count, referenceContacts.Count);
        if (contactRulesResult.IsFailure)
        {
            return contactRulesResult;
        }

        var changesResult = ValidateContactChanges(guardians, referenceContacts);
        if (changesResult.IsFailure)
        {
            return changesResult;
        }

        FullName = fullName;
        BirthDate = birthDate;
        Phone = phone;
        Email = email;
        Cpf = cpf;
        AdministrativeNotes = administrativeNotes;

        var guardiansResult = SyncGuardians(guardians);
        if (guardiansResult.IsFailure)
        {
            return guardiansResult;
        }

        return SyncReferenceContacts(referenceContacts);
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

    private DomainResult SyncGuardians(IReadOnlyCollection<ContactChange<GuardianData>> changes)
    {
        var keptIds = KeptIds(changes);
        _guardians.RemoveAll(guardian => !keptIds.Contains(guardian.Id));

        foreach (var change in changes)
        {
            if (change.Id is not { } id)
            {
                var guardianResult = ClientGuardian.Create(Guid.CreateVersion7(), Id, change.Data);
                if (guardianResult.IsFailure)
                {
                    return guardianResult;
                }

                _guardians.Add(guardianResult.Value);
                continue;
            }

            var updateResult = _guardians.Single(guardian => guardian.Id == id).Update(change.Data);
            if (updateResult.IsFailure)
            {
                return updateResult;
            }
        }

        return DomainResult.Success();
    }

    private DomainResult SyncReferenceContacts(IReadOnlyCollection<ContactChange<ReferenceContactData>> changes)
    {
        var keptIds = KeptIds(changes);
        _referenceContacts.RemoveAll(contact => !keptIds.Contains(contact.Id));

        foreach (var change in changes)
        {
            if (change.Id is not { } id)
            {
                var contactResult = ClientReferenceContact.Create(Guid.CreateVersion7(), Id, change.Data);
                if (contactResult.IsFailure)
                {
                    return contactResult;
                }

                _referenceContacts.Add(contactResult.Value);
                continue;
            }

            var updateResult = _referenceContacts.Single(contact => contact.Id == id).Update(change.Data);
            if (updateResult.IsFailure)
            {
                return updateResult;
            }
        }

        return DomainResult.Success();
    }

    private static HashSet<Guid> KeptIds<TData>(IReadOnlyCollection<ContactChange<TData>> changes)
    {
        return changes.Where(change => change.Id.HasValue).Select(change => change.Id!.Value).ToHashSet();
    }

    private DomainResult ValidateContactChanges(
        IReadOnlyCollection<ContactChange<GuardianData>> guardians,
        IReadOnlyCollection<ContactChange<ReferenceContactData>> referenceContacts)
    {
        var guardianIdsResult = ValidateContactIds(guardians, _guardians.Select(guardian => guardian.Id));
        if (guardianIdsResult.IsFailure)
        {
            return guardianIdsResult;
        }

        var referenceContactIdsResult = ValidateContactIds(
            referenceContacts,
            _referenceContacts.Select(contact => contact.Id));
        if (referenceContactIdsResult.IsFailure)
        {
            return referenceContactIdsResult;
        }

        foreach (var change in guardians)
        {
            var detailsResult = ClientContact.ValidateDetails(change.Data.Name, change.Data.Relationship);
            if (detailsResult.IsFailure)
            {
                return detailsResult;
            }
        }

        foreach (var change in referenceContacts)
        {
            var detailsResult = ClientContact.ValidateDetails(change.Data.Name.Value, change.Data.Relationship);
            if (detailsResult.IsFailure)
            {
                return detailsResult;
            }
        }

        return DomainResult.Success();
    }

    private static DomainResult ValidateContactIds<TData>(
        IReadOnlyCollection<ContactChange<TData>> changes,
        IEnumerable<Guid> currentIds)
    {
        var knownIds = currentIds.ToHashSet();
        var seenIds = new HashSet<Guid>();

        foreach (var change in changes)
        {
            if (change.Id is not { } id)
            {
                continue;
            }

            if (!knownIds.Contains(id))
            {
                return DomainResult.Failure(ContactNotFound);
            }

            if (!seenIds.Add(id))
            {
                return DomainResult.Failure(DuplicateContact);
            }
        }

        return DomainResult.Success();
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
