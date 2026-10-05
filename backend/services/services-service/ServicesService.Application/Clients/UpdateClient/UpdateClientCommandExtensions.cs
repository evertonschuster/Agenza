using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients.UpdateClient;

public static class UpdateClientCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateClientCommand command, Client client, DateOnly today)
    {
        var fullNameResult = FullName.Create(command.FullName);
        if (fullNameResult.IsFailure)
        {
            return fullNameResult;
        }

        var birthDateResult = BirthDate.Create(command.BirthDate, today);
        if (birthDateResult.IsFailure)
        {
            return birthDateResult;
        }

        var phoneResult = PhoneNumber.Create(command.Phone);
        if (phoneResult.IsFailure)
        {
            return phoneResult;
        }

        var emailResult = EmailAddress.Create(command.Email);
        if (emailResult.IsFailure)
        {
            return emailResult;
        }

        var cpfResult = CpfNumber.Create(command.Cpf);
        if (cpfResult.IsFailure)
        {
            return cpfResult;
        }

        var notesResult = AdministrativeNotes.Create(command.AdministrativeNotes);
        if (notesResult.IsFailure)
        {
            return notesResult;
        }

        var guardiansResult = ToGuardianChanges(command.Guardians);
        if (guardiansResult.IsFailure)
        {
            return guardiansResult;
        }

        var referenceContactsResult = ToReferenceContactChanges(command.ReferenceContacts);
        if (referenceContactsResult.IsFailure)
        {
            return referenceContactsResult;
        }

        return client.Update(
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

    private static DomainResult<List<ContactChange<GuardianData>>> ToGuardianChanges(
        IReadOnlyList<UpdateGuardianInput>? inputs)
    {
        var changes = new List<ContactChange<GuardianData>>();

        foreach (var input in inputs ?? [])
        {
            var guardianResult = ClientContactMapping.ToGuardianData(
                input.Name,
                input.Relationship,
                input.Phone,
                input.Cpf);
            if (guardianResult.IsFailure)
            {
                return DomainResult.Failure<List<ContactChange<GuardianData>>>(guardianResult.Error);
            }

            changes.Add(new ContactChange<GuardianData>(input.Id, guardianResult.Value));
        }

        return DomainResult.Success(changes);
    }

    private static DomainResult<List<ContactChange<ReferenceContactData>>> ToReferenceContactChanges(
        IReadOnlyList<UpdateReferenceContactInput>? inputs)
    {
        var changes = new List<ContactChange<ReferenceContactData>>();

        foreach (var input in inputs ?? [])
        {
            var contactResult = ClientContactMapping.ToReferenceContactData(
                input.Name,
                input.Relationship,
                input.Phone,
                input.Purposes);
            if (contactResult.IsFailure)
            {
                return DomainResult.Failure<List<ContactChange<ReferenceContactData>>>(contactResult.Error);
            }

            changes.Add(new ContactChange<ReferenceContactData>(input.Id, contactResult.Value));
        }

        return DomainResult.Success(changes);
    }
}
