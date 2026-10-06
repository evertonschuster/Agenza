using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;

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
    string Name,
    string Relationship,
    PhoneNumber? Phone,
    IReadOnlyList<string>? Purposes);
