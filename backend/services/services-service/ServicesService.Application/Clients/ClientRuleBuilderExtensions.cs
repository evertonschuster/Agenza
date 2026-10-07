using FluentValidation;

namespace ServicesService.Application.Clients;

public static class ClientRuleBuilderExtensions
{
    public const string GuardianMissingCode = "Client.GuardianMissing";
    public const string ReferenceContactMissingCode = "Client.ReferenceContactMissing";

    public static IRuleBuilderOptions<T, Guid> MustHaveAClientId<T>(this IRuleBuilder<T, Guid> rule)
    {
        return rule.NotEmpty()
            .WithErrorCode("Client.IdRequired")
            .WithMessage("O id da pessoa é obrigatório.");
    }

    public static IRuleBuilderOptions<T, IReadOnlyList<TItem>?> MustNotExceedTheGuardianLimit<T, TItem>(
        this IRuleBuilder<T, IReadOnlyList<TItem>?> rule)
    {
        return rule.Must(guardians => guardians is null || guardians.Count <= Client.MaxGuardians)
            .WithErrorCode(Client.TooManyGuardians.Code)
            .WithMessage($"Informe no máximo {Client.MaxGuardians} responsáveis.");
    }

    public static IRuleBuilderOptions<T, IReadOnlyList<TItem>?> MustHaveAGuardian<T, TItem>(
        this IRuleBuilder<T, IReadOnlyList<TItem>?> rule)
    {
        return rule.Must(guardians => guardians is { Count: > 0 })
            .WithErrorCode(Client.GuardianRequired.Code)
            .WithMessage($"Informe ao menos um responsável para pessoas menores de {BirthDate.AdultAgeInYears} anos.");
    }

    public static IRuleBuilderOptions<T, IReadOnlyList<TItem>?> MustNotExceedTheReferenceContactLimit<T, TItem>(
        this IRuleBuilder<T, IReadOnlyList<TItem>?> rule)
    {
        return rule.Must(contacts => contacts is null || contacts.Count <= Client.MaxReferenceContacts)
            .WithErrorCode(Client.TooManyReferenceContacts.Code)
            .WithMessage($"Informe no máximo {Client.MaxReferenceContacts} pessoas de referência.");
    }

    public static IRuleBuilderOptions<T, string> MustBeValidContactName<T>(
        this IRuleBuilderInitial<T, string> rule,
        string subject)
    {
        return rule.Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithErrorCode(ClientContact.NameRequired.Code)
            .WithMessage($"O nome {subject} é obrigatório.")
            .Must(name => name.Trim().Length >= ClientContact.NameMinLength)
            .WithErrorCode(ClientContact.InvalidNameLength.Code)
            .WithMessage($"O nome {subject} deve ter pelo menos {ClientContact.NameMinLength} caracteres.")
            .Must(name => name.Trim().Length <= ClientContact.NameMaxLength)
            .WithErrorCode(ClientContact.InvalidNameLength.Code)
            .WithMessage($"O nome {subject} deve ter no máximo {ClientContact.NameMaxLength} caracteres.");
    }

    public static IRuleBuilderOptions<T, string> MustBeValidContactRelationship<T>(
        this IRuleBuilderInitial<T, string> rule,
        string subject)
    {
        return rule.Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithErrorCode(ClientContact.RelationshipRequired.Code)
            .WithMessage($"O vínculo {subject} é obrigatório.")
            .Must(relationship => relationship.Trim().Length <= ClientContact.RelationshipMaxLength)
            .WithErrorCode(ClientContact.RelationshipTooLong.Code)
            .WithMessage($"O vínculo {subject} deve ter no máximo {ClientContact.RelationshipMaxLength} caracteres.");
    }

    public static IRuleBuilderOptions<T, IReadOnlyList<ContactPurpose>?> MustHaveAPurpose<T>(
        this IRuleBuilder<T, IReadOnlyList<ContactPurpose>?> rule)
    {
        return rule.Must(purposes => purposes is { Count: > 0 })
            .WithErrorCode(ClientReferenceContact.PurposesRequired.Code)
            .WithMessage("Informe ao menos uma finalidade para a pessoa de referência.");
    }

    public static IRuleBuilderOptions<T, ContactPurpose> MustBeAKnownPurpose<T>(
        this IRuleBuilder<T, ContactPurpose> rule)
    {
        return rule.IsInEnum()
            .WithErrorCode(ClientReferenceContact.PurposeUnknown.Code)
            .WithMessage("Informe apenas finalidades válidas para a pessoa de referência.");
    }
}
