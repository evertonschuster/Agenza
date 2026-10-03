using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Clients.CreateClient;

public static class CreateClientCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static DomainResult<Client> ToModel(this CreateClientCommand command, DateOnly today)
    {
        var guardiansResult = ToGuardians(command.Guardians);
        if (guardiansResult.IsFailure)
        {
            return DomainResult.Failure<Client>(guardiansResult.Error);
        }

        var referenceContactsResult = ToReferenceContacts(command.ReferenceContacts);
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
            guardiansResult.Value,
            referenceContactsResult.Value);
    }

    private static DomainResult<List<ClientGuardian>> ToGuardians(IReadOnlyList<GuardianInput>? inputs)
    {
        var guardians = new List<ClientGuardian>();

        foreach (var input in inputs ?? [])
        {
            var guardianResult = ClientGuardian.Create(
                Guid.CreateVersion7(),
                input.Name,
                input.Relationship,
                input.Phone,
                input.Cpf);

            if (guardianResult.IsFailure)
            {
                return DomainResult.Failure<List<ClientGuardian>>(guardianResult.Error);
            }

            guardians.Add(guardianResult.Value);
        }

        return DomainResult.Success(guardians);
    }

    private static DomainResult<List<ClientReferenceContact>> ToReferenceContacts(
        IReadOnlyList<ReferenceContactInput>? inputs)
    {
        var referenceContacts = new List<ClientReferenceContact>();

        foreach (var input in inputs ?? [])
        {
            var contactResult = ClientReferenceContact.Create(
                Guid.CreateVersion7(),
                input.Name,
                input.Relationship,
                input.Phone,
                input.Purposes);

            if (contactResult.IsFailure)
            {
                return DomainResult.Failure<List<ClientReferenceContact>>(contactResult.Error);
            }

            referenceContacts.Add(contactResult.Value);
        }

        return DomainResult.Success(referenceContacts);
    }
}
