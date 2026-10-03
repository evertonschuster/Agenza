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

        var birthDateResult = BirthDate.Create(command.BirthDate, today);
        if (birthDateResult.IsFailure)
        {
            return DomainResult.Failure<Client>(birthDateResult.Error);
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
            birthDateResult.Value,
            phoneResult.Value,
            emailResult.Value,
            cpfResult.Value,
            notesResult.Value,
            today,
            guardiansResult.Value,
            referenceContactsResult.Value);
    }

    private static DomainResult<List<GuardianData>> ToGuardians(IReadOnlyList<GuardianInput>? inputs)
    {
        var guardians = new List<GuardianData>();

        foreach (var input in inputs ?? [])
        {
            var guardianResult = ToGuardian(input);
            if (guardianResult.IsFailure)
            {
                return DomainResult.Failure<List<GuardianData>>(guardianResult.Error);
            }

            guardians.Add(guardianResult.Value);
        }

        return DomainResult.Success(guardians);
    }

    private static DomainResult<GuardianData> ToGuardian(GuardianInput input)
    {
        var phoneResult = PhoneNumber.Create(input.Phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<GuardianData>(phoneResult.Error);
        }

        var cpfResult = CpfNumber.Create(input.Cpf);
        if (cpfResult.IsFailure)
        {
            return DomainResult.Failure<GuardianData>(cpfResult.Error);
        }

        return DomainResult.Success(new GuardianData(input.Name, input.Relationship, phoneResult.Value, cpfResult.Value));
    }

    private static DomainResult<List<ReferenceContactData>> ToReferenceContacts(
        IReadOnlyList<ReferenceContactInput>? inputs)
    {
        var referenceContacts = new List<ReferenceContactData>();

        foreach (var input in inputs ?? [])
        {
            var contactResult = ToReferenceContact(input);
            if (contactResult.IsFailure)
            {
                return DomainResult.Failure<List<ReferenceContactData>>(contactResult.Error);
            }

            referenceContacts.Add(contactResult.Value);
        }

        return DomainResult.Success(referenceContacts);
    }

    private static DomainResult<ReferenceContactData> ToReferenceContact(ReferenceContactInput input)
    {
        var phoneResult = PhoneNumber.Create(input.Phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<ReferenceContactData>(phoneResult.Error);
        }

        var purposesResult = ContactPurposes.Create(ContactPurposeNames.ToPurposes(input.Purposes));
        if (purposesResult.IsFailure)
        {
            return DomainResult.Failure<ReferenceContactData>(purposesResult.Error);
        }

        return DomainResult.Success(new ReferenceContactData(
            input.Name,
            input.Relationship,
            phoneResult.Value,
            purposesResult.Value));
    }
}
