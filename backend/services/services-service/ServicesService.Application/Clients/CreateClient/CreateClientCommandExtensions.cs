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
        var guardians = new List<GuardianData>();

        foreach (var input in inputs ?? [])
        {
            guardians.Add(new GuardianData(input.Name, input.Relationship, input.Phone, input.Cpf));
        }

        return guardians;
    }

    private static List<ReferenceContactData> ToReferenceContacts(this IReadOnlyList<ReferenceContactInput>? inputs)
    {
        var referenceContacts = new List<ReferenceContactData>();

        foreach (var input in inputs ?? [])
        {
            referenceContacts.Add(new ReferenceContactData(
                input.Name,
                input.Relationship,
                input.Phone,
                new HashSet<ContactPurpose>(input.Purposes ?? [])));
        }

        return referenceContacts;
    }
}
