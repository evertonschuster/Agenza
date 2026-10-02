using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

// CPF and e-mail uniqueness per tenant are cross-aggregate rules, enforced in the use cases via IClientRepository
// and backed by unique indexes (ClientConfiguration), not here.
public class Client : TenantOwnedEntity
{
    public const int FullNameMinLength = 2;
    public const int FullNameMaxLength = 150;
    public const int AdministrativeNotesMaxLength = 500;
    public const int MaxGuardians = 10;
    public const int MaxReferenceContacts = 10;

    public string FullName { get; private set; }
    public DateOnly? BirthDate { get; private set; }
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string? Cpf { get; private set; }
    public string? AdministrativeNotes { get; private set; }
    public ClientStatus Status { get; private set; }

    private readonly List<ClientGuardian> _guardians = [];
    public IReadOnlyCollection<ClientGuardian> Guardians => _guardians;

    private readonly List<ClientReferenceContact> _referenceContacts = [];
    public IReadOnlyCollection<ClientReferenceContact> ReferenceContacts => _referenceContacts;

    // EF Core materialization only.
    private Client()
    {
        FullName = string.Empty;
    }

    private Client(
        Guid id,
        string fullName,
        DateOnly? birthDate,
        string? phone,
        string? email,
        string? cpf,
        string? administrativeNotes)
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
        string fullName,
        DateOnly? birthDate,
        string? phone,
        string? email,
        string? cpf,
        string? administrativeNotes,
        DateOnly today,
        IReadOnlyCollection<ClientGuardian> guardians,
        IReadOnlyCollection<ClientReferenceContact> referenceContacts)
    {
        var fullNameResult = ValidateFullName(fullName);
        if (fullNameResult.IsFailure)
        {
            return DomainResult.Failure<Client>(fullNameResult.Error);
        }

        if (birthDate is { } date)
        {
            var birthDateResult = BirthDateRules.Validate(date, today);
            if (birthDateResult.IsFailure)
            {
                return DomainResult.Failure<Client>(birthDateResult.Error);
            }
        }

        var phoneResult = PhoneNumber.Normalize(phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<Client>(phoneResult.Error);
        }

        var emailResult = EmailAddress.Normalize(email);
        if (emailResult.IsFailure)
        {
            return DomainResult.Failure<Client>(emailResult.Error);
        }

        var cpfResult = CpfNumber.Normalize(cpf);
        if (cpfResult.IsFailure)
        {
            return DomainResult.Failure<Client>(cpfResult.Error);
        }

        var notesResult = ValidateAdministrativeNotes(administrativeNotes);
        if (notesResult.IsFailure)
        {
            return DomainResult.Failure<Client>(notesResult.Error);
        }

        var contactsResult = ValidateContacts(birthDate, today, guardians, referenceContacts);
        if (contactsResult.IsFailure)
        {
            return DomainResult.Failure<Client>(contactsResult.Error);
        }

        var client = new Client(
            id,
            fullNameResult.Value,
            birthDate,
            phoneResult.Value,
            emailResult.Value,
            cpfResult.Value,
            notesResult.Value);
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

    private static DomainResult<string> ValidateFullName(string fullName)
    {
        var trimmed = fullName?.Trim() ?? string.Empty;

        if (trimmed.Length < FullNameMinLength || trimmed.Length > FullNameMaxLength)
        {
            return DomainResult.Failure<string>(new DomainError(
                "Client.Invalid",
                $"O nome completo é obrigatório e deve ter entre {FullNameMinLength} e {FullNameMaxLength} caracteres."));
        }

        return DomainResult.Success(trimmed);
    }

    private static DomainResult<string?> ValidateAdministrativeNotes(string? notes)
    {
        var trimmed = notes?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return DomainResult.Success<string?>(null);
        }

        if (trimmed.Length > AdministrativeNotesMaxLength)
        {
            return DomainResult.Failure<string?>(new DomainError(
                "Client.Invalid",
                $"As observações administrativas devem ter no máximo {AdministrativeNotesMaxLength} caracteres."));
        }

        return DomainResult.Success<string?>(trimmed);
    }

    private static DomainResult ValidateContacts(
        DateOnly? birthDate,
        DateOnly today,
        IReadOnlyCollection<ClientGuardian> guardians,
        IReadOnlyCollection<ClientReferenceContact> referenceContacts)
    {
        if (guardians.Count > MaxGuardians)
        {
            return DomainResult.Failure(new DomainError(
                "Client.Invalid",
                $"Informe no máximo {MaxGuardians} responsáveis."));
        }

        if (referenceContacts.Count > MaxReferenceContacts)
        {
            return DomainResult.Failure(new DomainError(
                "Client.Invalid",
                $"Informe no máximo {MaxReferenceContacts} pessoas de referência."));
        }

        if (birthDate is { } date && BirthDateRules.IsMinorOn(date, today) && guardians.Count == 0)
        {
            return DomainResult.Failure(new DomainError(
                "Client.Invalid",
                $"Informe ao menos um responsável para pessoas menores de {BirthDateRules.AdultAgeInYears} anos."));
        }

        return DomainResult.Success();
    }
}
