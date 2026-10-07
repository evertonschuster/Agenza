using Admin.SharedKernel;

namespace ServicesService.Application.Clients.UpdateClient;

public sealed record UpdateClientCommand(
    Guid ClientId,
    FullName FullName,
    BirthDate? BirthDate,
    PhoneNumber? Phone,
    EmailAddress? Email,
    CpfNumber? Cpf,
    AdministrativeNotes? AdministrativeNotes,
    IReadOnlyList<UpdateGuardianInput>? Guardians,
    IReadOnlyList<UpdateReferenceContactInput>? ReferenceContacts) : ICommand<ClientResponse>;

public sealed record UpdateGuardianInput(string Name, string Relationship, PhoneNumber? Phone, CpfNumber? Cpf);

public sealed record UpdateReferenceContactInput(
    FullName Name,
    string Relationship,
    PhoneNumber? Phone,
    IReadOnlyList<ContactPurpose>? Purposes);
