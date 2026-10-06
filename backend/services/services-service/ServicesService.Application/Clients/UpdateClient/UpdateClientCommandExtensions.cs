namespace ServicesService.Application.Clients.UpdateClient;

public static class UpdateClientCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateClientCommand command, Client client, DateOnly today)
    {
        var referenceContactsResult = command.ReferenceContacts.ToReferenceContacts();
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
            command.Guardians.ToGuardians(),
            referenceContactsResult.Value);
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

    private static DomainResult<List<ReferenceContactData>> ToReferenceContacts(
        this IReadOnlyList<UpdateReferenceContactInput>? inputs)
    {
        var referenceContacts = new List<ReferenceContactData>();

        foreach (var input in inputs ?? [])
        {
            var contactResult = input.ToReferenceContact();
            if (contactResult.IsFailure)
            {
                return DomainResult.Failure<List<ReferenceContactData>>(contactResult.Error);
            }

            referenceContacts.Add(contactResult.Value);
        }

        return DomainResult.Success(referenceContacts);
    }

    private static DomainResult<ReferenceContactData> ToReferenceContact(
        this UpdateReferenceContactInput input)
    {
        var purposesResult = ContactPurposes.Create(ContactPurposeNames.ToPurposes(input.Purposes));
        if (purposesResult.IsFailure)
        {
            return DomainResult.Failure<ReferenceContactData>(purposesResult.Error);
        }

        return DomainResult.Success(new ReferenceContactData(
            input.Name,
            input.Relationship,
            input.Phone,
            purposesResult.Value));
    }
}
