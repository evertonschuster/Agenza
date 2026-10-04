using Admin.SharedKernel;

namespace ServicesService.Application.Clients.CreateClient;

public sealed record CreateClientCommand(
    string FullName,
    DateOnly? BirthDate,
    string? Phone,
    string? Email,
    string? Cpf,
    string? AdministrativeNotes,
    IReadOnlyList<GuardianInput>? Guardians,
    IReadOnlyList<ReferenceContactInput>? ReferenceContacts) : ICommand<ClientResponse>;

public sealed record GuardianInput(string Name, string Relationship, string? Phone, string? Cpf);

public sealed record ReferenceContactInput(
    string Name,
    string Relationship,
    string? Phone,
    IReadOnlyList<string>? Purposes);
