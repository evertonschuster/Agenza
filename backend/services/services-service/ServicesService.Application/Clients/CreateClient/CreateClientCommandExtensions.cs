namespace ServicesService.Application.Clients.CreateClient;

public static class CreateClientCommandExtensions
{
    public static ClientData ToClientData(this CreateClientCommand command)
    {
        return new ClientData(
            command.FullName,
            command.BirthDate,
            command.Phone,
            command.Email,
            command.Cpf,
            command.AdministrativeNotes,
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
