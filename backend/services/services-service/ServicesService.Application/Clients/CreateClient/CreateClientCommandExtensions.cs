namespace ServicesService.Application.Clients.CreateClient;

public static class CreateClientCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static DomainResult<Client> ToModel(this CreateClientCommand command, DateOnly today)
    {
        var referenceContactsResult = command.ReferenceContacts.ToReferenceContacts();
        if (referenceContactsResult.IsFailure)
        {
            return DomainResult.Failure<Client>(referenceContactsResult.Error);
        }

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
            referenceContactsResult.Value);
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

    private static DomainResult<List<ReferenceContactData>> ToReferenceContacts(this IReadOnlyList<ReferenceContactInput>? inputs)
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

    private static DomainResult<ReferenceContactData> ToReferenceContact(this ReferenceContactInput input)
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
