using Admin.SharedKernel;

namespace ServicesService.Application.Clients.CreateClient;

public sealed record CreateClientCommand(
    FullName FullName,
    BirthDate? BirthDate,
    PhoneNumber? Phone,
    EmailAddress? Email,
    CpfNumber? Cpf,
    AdministrativeNotes? AdministrativeNotes,
    IReadOnlyList<GuardianInput>? Guardians,
    IReadOnlyList<ReferenceContactInput>? ReferenceContacts) : ICommand<ClientResponse>;

public sealed record GuardianInput(string Name, string Relationship, PhoneNumber? Phone, CpfNumber? Cpf);

public sealed record ReferenceContactInput(
    FullName Name,
    string Relationship,
    PhoneNumber? Phone,
    IReadOnlyList<ContactPurpose>? Purposes);
