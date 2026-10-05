using System.Text.Json.Serialization;
using Admin.SharedKernel;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients.CreateClient;

public sealed record CreateClientCommand(
    string FullName,
    DateOnly? BirthDate,
    string? Phone,
    string? Email,
    [property: JsonConverter(typeof(CpfNumberJsonConverter))] CpfNumber? Cpf,
    string? AdministrativeNotes,
    IReadOnlyList<GuardianInput>? Guardians,
    IReadOnlyList<ReferenceContactInput>? ReferenceContacts) : ICommand<ClientResponse>;

public sealed record GuardianInput(
    string Name,
    string Relationship,
    string? Phone,
    [property: JsonConverter(typeof(CpfNumberJsonConverter))] CpfNumber? Cpf);

public sealed record ReferenceContactInput(
    string Name,
    string Relationship,
    string? Phone,
    IReadOnlyList<string>? Purposes);
