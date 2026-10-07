namespace ServicesService.Application.Clients.UpdateClient;

public static class UpdateClientCommandExtensions
{
    public static ClientData ToClientData(this UpdateClientCommand command)
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

    private static List<GuardianData> ToGuardians(this IReadOnlyList<UpdateGuardianInput>? inputs)
    {
        return (inputs ?? []).Select(input => input.ToGuardian()).ToList();
    }

    private static GuardianData ToGuardian(this UpdateGuardianInput input)
    {
        return new GuardianData(input.Name, input.Relationship, input.Phone, input.Cpf);
    }

    private static List<ReferenceContactData> ToReferenceContacts(
        this IReadOnlyList<UpdateReferenceContactInput>? inputs)
    {
        return inputs?.Select(input => input.ToReferenceContact()).ToList() ?? [];
    }

    private static ReferenceContactData ToReferenceContact(this UpdateReferenceContactInput input)
    {
        return new ReferenceContactData(
            input.Name,
            input.Relationship,
            input.Phone,
            new HashSet<ContactPurpose>(input.Purposes ?? []));
    }
}
