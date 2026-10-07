namespace ServicesService.Domain.Entities;

public sealed record ClientData(
    FullName FullName,
    BirthDate? BirthDate,
    PhoneNumber? Phone,
    EmailAddress? Email,
    CpfNumber? Cpf,
    AdministrativeNotes? AdministrativeNotes,
    IReadOnlyCollection<GuardianData> Guardians,
    IReadOnlyCollection<ReferenceContactData> ReferenceContacts);
