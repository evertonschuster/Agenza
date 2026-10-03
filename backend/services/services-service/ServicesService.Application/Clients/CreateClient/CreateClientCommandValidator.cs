using FluentValidation;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients.CreateClient;

public sealed class CreateClientCommandValidator : AbstractValidator<CreateClientCommand>
{
    public CreateClientCommandValidator(TimeProvider timeProvider)
    {
        DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        RuleFor(command => command.FullName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("O nome completo é obrigatório.")
            .Must(fullName => fullName.Trim().Length >= Client.FullNameMinLength)
            .WithMessage($"O nome completo deve ter pelo menos {Client.FullNameMinLength} caracteres.")
            .Must(fullName => fullName.Trim().Length <= Client.FullNameMaxLength)
            .WithMessage($"O nome completo deve ter no máximo {Client.FullNameMaxLength} caracteres.");

        RuleFor(command => command.BirthDate)
            .Cascade(CascadeMode.Stop)
            .Must(birthDate => BirthDateRules.IsInThePast(birthDate!.Value, Today()))
            .WithMessage("A data de nascimento deve estar no passado.")
            .Must(birthDate => BirthDateRules.IsWithinMaxAge(birthDate!.Value, Today()))
            .WithMessage($"A data de nascimento não pode indicar idade superior a {BirthDateRules.MaxAgeInYears} anos.")
            .When(command => command.BirthDate.HasValue);

        RuleFor(command => command.Phone).MustBeValidPhone();

        RuleFor(command => command.Email)
            .Cascade(CascadeMode.Stop)
            .Must(email => email is null || email.Trim().Length <= EmailAddress.MaxLength)
            .WithMessage($"O e-mail deve ter no máximo {EmailAddress.MaxLength} caracteres.")
            .Must(email => string.IsNullOrWhiteSpace(email) || EmailAddress.HasValidShape(email.Trim().ToLowerInvariant()))
            .WithMessage("Informe um e-mail válido.");

        RuleFor(command => command.Cpf).MustBeValidCpf();

        RuleFor(command => command.AdministrativeNotes)
            .Must(notes => notes is null || notes.Trim().Length <= Client.AdministrativeNotesMaxLength)
            .WithMessage(
                $"As observações administrativas devem ter no máximo {Client.AdministrativeNotesMaxLength} caracteres.");

        RuleFor(command => command.Guardians)
            .Must(guardians => guardians is null || guardians.Count <= Client.MaxGuardians)
            .WithMessage($"Informe no máximo {Client.MaxGuardians} responsáveis.");

        RuleFor(command => command.Guardians)
            .Must(guardians => guardians is { Count: > 0 })
            .WithMessage($"Informe ao menos um responsável para pessoas menores de {BirthDateRules.AdultAgeInYears} anos.")
            .When(command => command.BirthDate is { } birthDate
                && BirthDateRules.IsMinorOn(birthDate, Today()));

        RuleForEach(command => command.Guardians)
            .NotNull().WithMessage("Informe os dados do responsável.")
            .SetValidator(new GuardianInputValidator());

        RuleFor(command => command.ReferenceContacts)
            .Must(contacts => contacts is null || contacts.Count <= Client.MaxReferenceContacts)
            .WithMessage($"Informe no máximo {Client.MaxReferenceContacts} pessoas de referência.");

        RuleForEach(command => command.ReferenceContacts)
            .NotNull().WithMessage("Informe os dados da pessoa de referência.")
            .SetValidator(new ReferenceContactInputValidator());
    }
}

public sealed class GuardianInputValidator : AbstractValidator<GuardianInput>
{
    public GuardianInputValidator()
    {
        RuleFor(guardian => guardian.Name).MustBeValidContactName("do responsável");
        RuleFor(guardian => guardian.Relationship).MustBeValidContactRelationship("do responsável");
        RuleFor(guardian => guardian.Phone).MustBeValidPhone();
        RuleFor(guardian => guardian.Cpf).MustBeValidCpf();
    }
}

public sealed class ReferenceContactInputValidator : AbstractValidator<ReferenceContactInput>
{
    public ReferenceContactInputValidator()
    {
        RuleFor(contact => contact.Name).MustBeValidContactName("da pessoa de referência");
        RuleFor(contact => contact.Relationship).MustBeValidContactRelationship("da pessoa de referência");
        RuleFor(contact => contact.Phone).MustBeValidPhone();

        RuleFor(contact => contact.Purposes)
            .Cascade(CascadeMode.Stop)
            .Must(purposes => purposes is { Count: > 0 })
            .WithMessage("Informe ao menos uma finalidade para a pessoa de referência.")
            .Must(purposes => purposes!.All(ContactPurposes.IsKnown))
            .WithMessage($"A finalidade deve ser uma das seguintes: {string.Join(", ", ContactPurposes.Names)}.");
    }
}
