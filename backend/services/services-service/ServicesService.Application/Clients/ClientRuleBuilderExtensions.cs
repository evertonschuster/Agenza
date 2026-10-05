using FluentValidation;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients;

public static class ClientRuleBuilderExtensions
{
    public const string GuardianMissingCode = "Client.GuardianMissing";
    public const string ReferenceContactMissingCode = "Client.ReferenceContactMissing";

    public static IRuleBuilderOptions<T, string> MustBeValidFullName<T>(this IRuleBuilderInitial<T, string> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithErrorCode(FullName.Required.Code)
            .WithMessage("O nome completo é obrigatório.")
            .Must(fullName => fullName.Trim().Length >= FullName.MinLength)
            .WithErrorCode(FullName.InvalidLength.Code)
            .WithMessage($"O nome completo deve ter pelo menos {FullName.MinLength} caracteres.")
            .Must(fullName => fullName.Trim().Length <= FullName.MaxLength)
            .WithErrorCode(FullName.InvalidLength.Code)
            .WithMessage($"O nome completo deve ter no máximo {FullName.MaxLength} caracteres.");
    }

    public static IRuleBuilderOptions<T, DateOnly?> MustBeValidBirthDate<T>(
        this IRuleBuilderInitial<T, DateOnly?> rule,
        Func<DateOnly> today)
    {
        return rule.Cascade(CascadeMode.Stop)
            .Must(birthDate => birthDate is null || BirthDate.IsInThePast(birthDate.Value, today()))
            .WithErrorCode(BirthDate.NotInThePast.Code)
            .WithMessage("A data de nascimento deve estar no passado.")
            .Must(birthDate => birthDate is null || BirthDate.IsWithinMaxAge(birthDate.Value, today()))
            .WithErrorCode(BirthDate.TooOld.Code)
            .WithMessage($"A data de nascimento não pode indicar idade superior a {BirthDate.MaxAgeInYears} anos.");
    }

    public static IRuleBuilderOptions<T, string?> MustBeValidPhone<T>(this IRuleBuilder<T, string?> rule)
    {
        return rule.Must(phone => string.IsNullOrWhiteSpace(phone) || PhoneNumber.HasValidShape(phone.Trim()))
            .WithErrorCode(PhoneNumber.Invalid.Code)
            .WithMessage(
                $"Informe um telefone válido, com até {PhoneNumber.MaxLength} caracteres entre dígitos, espaços, +, parênteses e hífen.");
    }

    public static IRuleBuilderOptions<T, string?> MustBeValidEmail<T>(this IRuleBuilderInitial<T, string?> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .Must(email => email is null || email.Trim().Length <= EmailAddress.MaxLength)
            .WithErrorCode(EmailAddress.Invalid.Code)
            .WithMessage($"O e-mail deve ter no máximo {EmailAddress.MaxLength} caracteres.")
            .Must(email => string.IsNullOrWhiteSpace(email) || EmailAddress.HasValidShape(email.Trim().ToLowerInvariant()))
            .WithErrorCode(EmailAddress.Invalid.Code)
            .WithMessage("Informe um e-mail válido.");
    }

    public static IRuleBuilderOptions<T, string?> MustBeValidCpf<T>(this IRuleBuilder<T, string?> rule)
    {
        return rule.Must(cpf => string.IsNullOrWhiteSpace(cpf) || CpfNumber.IsValid(cpf))
            .WithErrorCode(CpfNumber.Invalid.Code)
            .WithMessage("Informe um CPF válido.");
    }

    public static IRuleBuilderOptions<T, string?> MustBeValidAdministrativeNotes<T>(
        this IRuleBuilder<T, string?> rule)
    {
        return rule.Must(notes => notes is null || notes.Trim().Length <= AdministrativeNotes.MaxLength)
            .WithErrorCode(AdministrativeNotes.TooLong.Code)
            .WithMessage(
                $"As observações administrativas devem ter no máximo {AdministrativeNotes.MaxLength} caracteres.");
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

    public static IRuleBuilderOptions<T, IReadOnlyList<string>?> MustHaveValidPurposes<T>(
        this IRuleBuilderInitial<T, IReadOnlyList<string>?> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .Must(purposes => purposes is { Count: > 0 })
            .WithErrorCode(ContactPurposes.Required.Code)
            .WithMessage("Informe ao menos uma finalidade para a pessoa de referência.")
            .Must(ContactPurposeNames.AreKnown)
            .WithErrorCode(ContactPurposeNames.UnknownCode)
            .WithMessage(ContactPurposeNames.UnknownMessage);
    }
}
