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

public sealed record UpdateGuardianInput(Guid? Id, string Name, string Relationship, PhoneNumber? Phone, CpfNumber? Cpf);

public sealed record UpdateReferenceContactInput(
    Guid? Id,
    FullName Name,
    string Relationship,
    PhoneNumber? Phone,
    IReadOnlyList<string>? Purposes);
