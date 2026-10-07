namespace ServicesService.Application.Clients.UpdateClient;

public static class UpdateClientCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateClientCommand command, Client client, DateOnly today)
    {
        return client.Update(
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

    private static List<GuardianData> ToGuardians(this IReadOnlyList<UpdateGuardianInput>? inputs)
    {
        var guardians = new List<GuardianData>();

        foreach (var input in inputs ?? [])
        {
            guardians.Add(input.ToGuardian());
        }

        return guardians;
    }

    private static GuardianData ToGuardian(this UpdateGuardianInput input)
    {
        return new GuardianData(input.Name, input.Relationship, input.Phone, input.Cpf);
    }

    private static List<ReferenceContactData> ToReferenceContacts(
        this IReadOnlyList<UpdateReferenceContactInput>? inputs)
    {
        var referenceContacts = new List<ReferenceContactData>();

        foreach (var input in inputs ?? [])
        {
            referenceContacts.Add(input.ToReferenceContact());
        }

        return referenceContacts;
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
