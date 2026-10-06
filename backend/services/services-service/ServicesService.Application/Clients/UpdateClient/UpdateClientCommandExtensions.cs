namespace ServicesService.Application.Clients.UpdateClient;

public static class UpdateClientCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateClientCommand command, Client client, DateOnly today)
    {
        var referenceContactsResult = command.ReferenceContacts.ToReferenceContactChanges();
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
            command.Guardians.ToGuardianChanges(),
            referenceContactsResult.Value);
    }

    private static List<ContactChange<GuardianData>> ToGuardianChanges(this IReadOnlyList<UpdateGuardianInput>? inputs)
    {
        var changes = new List<ContactChange<GuardianData>>();

        foreach (var input in inputs ?? [])
        {
            changes.Add(input.ToGuardianChange());
        }

        return changes;
    }

    private static ContactChange<GuardianData> ToGuardianChange(this UpdateGuardianInput input)
    {
        return new ContactChange<GuardianData>(
            input.Id,
            new GuardianData(input.Name, input.Relationship, input.Phone, input.Cpf));
    }

    private static DomainResult<List<ContactChange<ReferenceContactData>>> ToReferenceContactChanges(
        this IReadOnlyList<UpdateReferenceContactInput>? inputs)
    {
        var changes = new List<ContactChange<ReferenceContactData>>();

        foreach (var input in inputs ?? [])
        {
            var changeResult = input.ToReferenceContactChange();
            if (changeResult.IsFailure)
            {
                return DomainResult.Failure<List<ContactChange<ReferenceContactData>>>(changeResult.Error);
            }

            changes.Add(changeResult.Value);
        }

        return DomainResult.Success(changes);
    }

    private static DomainResult<ContactChange<ReferenceContactData>> ToReferenceContactChange(
        this UpdateReferenceContactInput input)
    {
        var purposesResult = ContactPurposes.Create(ContactPurposeNames.ToPurposes(input.Purposes));
        if (purposesResult.IsFailure)
        {
            return DomainResult.Failure<ContactChange<ReferenceContactData>>(purposesResult.Error);
        }

        return DomainResult.Success(new ContactChange<ReferenceContactData>(
            input.Id,
            new ReferenceContactData(input.Name, input.Relationship, input.Phone, purposesResult.Value)));
    }
}
