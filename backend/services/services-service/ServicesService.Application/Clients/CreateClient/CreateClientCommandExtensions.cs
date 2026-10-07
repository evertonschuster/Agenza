namespace ServicesService.Application.Clients.CreateClient;

public static class CreateClientCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static DomainResult<Client> ToModel(this CreateClientCommand command, DateOnly today)
    {
        return Client.Create(
            Guid.CreateVersion7(),
            command.FullName,
            command.BirthDate,
            command.Phone,
            command.Email,
            command.Cpf,
            command.AdministrativeNotes,
            today,
            command.Guardians.ToGuardians(),
            command.ReferenceContacts.ToReferenceContacts());
    }

    private static List<GuardianData> ToGuardians(this IReadOnlyList<GuardianInput>? inputs)
    {
        return (inputs ?? []).Select(input => new GuardianData(input.Name, input.Relationship, input.Phone, input.Cpf)).ToList();
    }

    private static List<ReferenceContactData> ToReferenceContacts(
        this IReadOnlyList<ReferenceContactInput>? inputs)
    {
        return inputs?.Select(input => input.ToReferenceContact()).ToList() ?? [];
    }

    private static ReferenceContactData ToReferenceContact(this ReferenceContactInput input)
    {
        return new ReferenceContactData(
            input.Name,
            input.Relationship,
            input.Phone,
            new HashSet<ContactPurpose>(input.Purposes ?? []));
    }
}
