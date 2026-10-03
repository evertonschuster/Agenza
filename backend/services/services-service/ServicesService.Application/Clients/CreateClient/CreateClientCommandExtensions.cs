using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients.CreateClient;

public static class CreateClientCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static DomainResult<Client> ToModel(this CreateClientCommand command, DateOnly today)
    {
        var fullNameResult = FullName.Create(command.FullName);
        if (fullNameResult.IsFailure)
        {
            return DomainResult.Failure<Client>(fullNameResult.Error);
        }

        var phoneResult = PhoneNumber.Create(command.Phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<Client>(phoneResult.Error);
        }

        var emailResult = EmailAddress.Create(command.Email);
        if (emailResult.IsFailure)
        {
            return DomainResult.Failure<Client>(emailResult.Error);
        }

        var cpfResult = CpfNumber.Create(command.Cpf);
        if (cpfResult.IsFailure)
        {
            return DomainResult.Failure<Client>(cpfResult.Error);
        }

        var notesResult = AdministrativeNotes.Create(command.AdministrativeNotes);
        if (notesResult.IsFailure)
        {
            return DomainResult.Failure<Client>(notesResult.Error);
        }

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
            fullNameResult.Value,
            command.BirthDate,
            phoneResult.Value,
            emailResult.Value,
            cpfResult.Value,
            notesResult.Value,
            today,
            guardiansResult.Value,
            referenceContactsResult.Value);
    }

    private static DomainResult<List<ClientGuardian>> ToGuardians(IReadOnlyList<GuardianInput>? inputs)
    {
        var guardians = new List<ClientGuardian>();

        foreach (var input in inputs ?? [])
        {
            var guardianResult = ToGuardian(input);
            if (guardianResult.IsFailure)
            {
                return DomainResult.Failure<List<ClientGuardian>>(guardianResult.Error);
            }

            guardians.Add(guardianResult.Value);
        }

        return DomainResult.Success(guardians);
    }

    private static DomainResult<ClientGuardian> ToGuardian(GuardianInput input)
    {
        var phoneResult = PhoneNumber.Create(input.Phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<ClientGuardian>(phoneResult.Error);
        }

        var cpfResult = CpfNumber.Create(input.Cpf);
        if (cpfResult.IsFailure)
        {
            return DomainResult.Failure<ClientGuardian>(cpfResult.Error);
        }

        return ClientGuardian.Create(
            Guid.CreateVersion7(),
            input.Name,
            input.Relationship,
            phoneResult.Value,
            cpfResult.Value);
    }

    private static DomainResult<List<ClientReferenceContact>> ToReferenceContacts(
        IReadOnlyList<ReferenceContactInput>? inputs)
    {
        var referenceContacts = new List<ClientReferenceContact>();

        foreach (var input in inputs ?? [])
        {
            var contactResult = ToReferenceContact(input);
            if (contactResult.IsFailure)
            {
                return DomainResult.Failure<List<ClientReferenceContact>>(contactResult.Error);
            }

            referenceContacts.Add(contactResult.Value);
        }

        return DomainResult.Success(referenceContacts);
    }

    private static DomainResult<ClientReferenceContact> ToReferenceContact(ReferenceContactInput input)
    {
        var phoneResult = PhoneNumber.Create(input.Phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(phoneResult.Error);
        }

        return ClientReferenceContact.Create(
            Guid.CreateVersion7(),
            input.Name,
            input.Relationship,
            phoneResult.Value,
            input.Purposes);
    }
}
