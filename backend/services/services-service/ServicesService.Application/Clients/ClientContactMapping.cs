using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients;

public static class ClientContactMapping
{
    public static DomainResult<GuardianData> ToGuardianData(
        string name,
        string relationship,
        string? phone,
        string? cpf)
    {
        var phoneResult = PhoneNumber.Create(phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<GuardianData>(phoneResult.Error);
        }

        var cpfResult = CpfNumber.Create(cpf);
        if (cpfResult.IsFailure)
        {
            return DomainResult.Failure<GuardianData>(cpfResult.Error);
        }

        return DomainResult.Success(new GuardianData(name, relationship, phoneResult.Value, cpfResult.Value));
    }

    public static DomainResult<ReferenceContactData> ToReferenceContactData(
        string name,
        string relationship,
        string? phone,
        IReadOnlyList<string>? purposes)
    {
        var phoneResult = PhoneNumber.Create(phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<ReferenceContactData>(phoneResult.Error);
        }

        var purposesResult = ContactPurposes.Create(ContactPurposeNames.ToPurposes(purposes));
        if (purposesResult.IsFailure)
        {
            return DomainResult.Failure<ReferenceContactData>(purposesResult.Error);
        }

        return DomainResult.Success(new ReferenceContactData(name, relationship, phoneResult.Value, purposesResult.Value));
    }
}
