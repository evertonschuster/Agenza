using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Clients.CreateClient;

public static class CreateClientCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static DomainResult<Client> ToModel(this CreateClientCommand command, DateOnly today)
    {
        var guardians = new List<ClientGuardian>();
        foreach (var input in command.Guardians ?? [])
        {
            var guardianResult = ClientGuardian.Create(
                Guid.CreateVersion7(), input.Name, input.Relationship, input.Phone, input.Cpf);
            if (guardianResult.IsFailure)
            {
                return DomainResult.Failure<Client>(guardianResult.Error);
            }

            guardians.Add(guardianResult.Value);
        }

        var referenceContacts = new List<ClientReferenceContact>();
        foreach (var input in command.ReferenceContacts ?? [])
        {
            var contactResult = ClientReferenceContact.Create(
                Guid.CreateVersion7(), input.Name, input.Relationship, input.Phone, input.Purposes);
            if (contactResult.IsFailure)
            {
                return DomainResult.Failure<Client>(contactResult.Error);
            }

            referenceContacts.Add(contactResult.Value);
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
            guardians,
            referenceContacts);
    }
}
