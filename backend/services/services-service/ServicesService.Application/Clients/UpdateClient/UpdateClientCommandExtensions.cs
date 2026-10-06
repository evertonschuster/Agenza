namespace ServicesService.Application.Clients.UpdateClient;

public static class UpdateClientCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateClientCommand command, Client client, DateOnly today)
    {
        var referenceContactsResult = ToReferenceContactChanges(command.ReferenceContacts);
        if (referenceContactsResult.IsFailure)
        {
            return referenceContactsResult;
        }

        return client.Update(
            command.FullName,
            command.BirthDate,
            command.Phone,
            command.Email,
            command.Cpf,
            command.AdministrativeNotes,
            today,
            ToGuardianChanges(command.Guardians),
            referenceContactsResult.Value);
    }

    private static List<ContactChange<GuardianData>> ToGuardianChanges(
        IReadOnlyList<UpdateGuardianInput>? inputs)
    {
        var changes = new List<ContactChange<GuardianData>>();

        foreach (var input in inputs ?? [])
        {
            changes.Add(new ContactChange<GuardianData>(
                input.Id,
                new GuardianData(input.Name, input.Relationship, input.Phone, input.Cpf)));
        }

        return changes;
    }

    private static DomainResult<List<ContactChange<ReferenceContactData>>> ToReferenceContactChanges(
        IReadOnlyList<UpdateReferenceContactInput>? inputs)
    {
        var changes = new List<ContactChange<ReferenceContactData>>();

        foreach (var input in inputs ?? [])
        {
            var purposesResult = ContactPurposes.Create(ContactPurposeNames.ToPurposes(input.Purposes));
            if (purposesResult.IsFailure)
            {
                return DomainResult.Failure<List<ContactChange<ReferenceContactData>>>(purposesResult.Error);
            }

            changes.Add(new ContactChange<ReferenceContactData>(
                input.Id,
                new ReferenceContactData(input.Name, input.Relationship, input.Phone, purposesResult.Value)));
        }

        return DomainResult.Success(changes);
    }
}
