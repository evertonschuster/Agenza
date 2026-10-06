using FluentValidation;

namespace ServicesService.Application.Clients;

public static class ClientRuleBuilderExtensions
{
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
}
