using Admin.SharedKernel;

namespace ServicesService.Application.Clients.UpdateClient;

public sealed record UpdateClientCommand(
    Guid ClientId,
    string FullName,
    DateOnly? BirthDate,
    string? Phone,
    string? Email,
    string? Cpf,
    string? AdministrativeNotes,
    IReadOnlyList<UpdateGuardianInput>? Guardians,
    IReadOnlyList<UpdateReferenceContactInput>? ReferenceContacts) : ICommand<ClientResponse>;

public sealed record UpdateGuardianInput(Guid? Id, string Name, string Relationship, string? Phone, string? Cpf);

public sealed record UpdateReferenceContactInput(
    Guid? Id,
    string Name,
    string Relationship,
    string? Phone,
    IReadOnlyList<string>? Purposes);
