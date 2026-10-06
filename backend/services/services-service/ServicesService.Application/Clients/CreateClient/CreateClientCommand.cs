using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;

namespace ServicesService.Application.Clients.CreateClient;

public sealed record CreateClientCommand(
    string FullName,
    DateOnly? BirthDate,
    string? Phone,
    string? Email,
    CpfNumber? Cpf,
    string? AdministrativeNotes,
    IReadOnlyList<GuardianInput>? Guardians,
    IReadOnlyList<ReferenceContactInput>? ReferenceContacts) : ICommand<ClientResponse>;

public sealed record GuardianInput(string Name, string Relationship, string? Phone, CpfNumber? Cpf);

public sealed record ReferenceContactInput(
    string Name,
    string Relationship,
    string? Phone,
    IReadOnlyList<string>? Purposes);
