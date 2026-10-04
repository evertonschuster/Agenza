using FluentValidation;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients;

public static class ClientRuleBuilderExtensions
{
    public static IRuleBuilderOptions<T, string?> MustBeValidPhone<T>(this IRuleBuilder<T, string?> rule)
    {
        return rule.Must(phone => string.IsNullOrWhiteSpace(phone) || PhoneNumber.HasValidShape(phone.Trim()))
            .WithErrorCode(PhoneNumber.Invalid.Code)
            .WithMessage(
                $"Informe um telefone válido, com até {PhoneNumber.MaxLength} caracteres entre dígitos, espaços, +, parênteses e hífen.");
    }

    public static IRuleBuilderOptions<T, string?> MustBeValidCpf<T>(this IRuleBuilder<T, string?> rule)
    {
        return rule.Must(cpf => string.IsNullOrWhiteSpace(cpf) || CpfNumber.IsValid(cpf))
            .WithErrorCode(CpfNumber.Invalid.Code)
            .WithMessage("Informe um CPF válido.");
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
}
