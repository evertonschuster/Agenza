namespace ServicesService.Application.Clients;

public sealed record ClientResponse(
    Guid Id,
    string FullName,
    DateOnly? BirthDate,
    string? Phone,
    string? Email,
    string? Cpf,
    string? AdministrativeNotes,
    string Status,
    IReadOnlyList<GuardianResponse> Guardians,
    IReadOnlyList<ReferenceContactResponse> ReferenceContacts)
{
    public static ClientResponse FromClient(Client client) =>
        new(
            client.Id,
            client.FullName.Value,
            client.BirthDate?.Value,
            client.Phone?.Value,
            client.Email?.Value,
            client.Cpf?.Value,
            client.AdministrativeNotes?.Value,
            client.Status.ToString().ToLowerInvariant(),
            client.Guardians.Select(GuardianResponse.FromGuardian).ToList(),
            client.ReferenceContacts.Select(ReferenceContactResponse.FromReferenceContact).ToList());
}

public sealed record GuardianResponse(Guid Id, string Name, string Relationship, string? Phone, string? Cpf)
{
    public static GuardianResponse FromGuardian(ClientGuardian guardian) =>
        new(guardian.Id, guardian.Name, guardian.Relationship, guardian.Phone?.Value, guardian.Cpf?.Value);
}

public sealed record ReferenceContactResponse(
    Guid Id,
    string Name,
    string Relationship,
    string? Phone,
    IReadOnlyList<ContactPurpose> Purposes)
{
    public static ReferenceContactResponse FromReferenceContact(ClientReferenceContact contact) =>
        new(
            contact.Id,
            contact.Name,
            contact.Relationship,
            contact.Phone?.Value,
            contact.Purposes.Order().ToList());
}
