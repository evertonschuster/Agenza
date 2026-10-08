using FluentValidation;

namespace ServicesService.Application.Clients.CreateClient;

public sealed class CreateClientCommandValidator : AbstractValidator<CreateClientCommand>
{
    public CreateClientCommandValidator(TimeProvider timeProvider)
    {
        DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        RuleFor(command => command.Guardians)
            .Must(guardians => guardians is null || guardians.Count <= Client.MaxGuardians)
            .WithErrorCode(Client.TooManyGuardians.Code)
            .WithMessage($"Informe no máximo {Client.MaxGuardians} responsáveis.");

        RuleFor(command => command.Guardians)
            .Must(guardians => guardians is { Count: > 0 })
            .WithErrorCode(Client.GuardianRequired.Code)
            .WithMessage($"Informe ao menos um responsável para pessoas menores de {BirthDate.AdultAgeInYears} anos.")
            .When(command => command.BirthDate is { } birthDate && birthDate.IsMinorOn(Today()));

        RuleForEach(command => command.Guardians)
            .NotNull()
            .WithErrorCode("Client.GuardianMissing")
            .WithMessage("Informe os dados do responsável.")
            .SetValidator(new GuardianInputValidator())
            .When(command => command.Guardians is null || command.Guardians.Count <= Client.MaxGuardians);

        RuleFor(command => command.ReferenceContacts)
            .Must(contacts => contacts is null || contacts.Count <= Client.MaxReferenceContacts)
            .WithErrorCode(Client.TooManyReferenceContacts.Code)
            .WithMessage($"Informe no máximo {Client.MaxReferenceContacts} pessoas de referência.");

        RuleForEach(command => command.ReferenceContacts)
            .NotNull()
            .WithErrorCode("Client.ReferenceContactMissing")
            .WithMessage("Informe os dados da pessoa de referência.")
            .SetValidator(new ReferenceContactInputValidator())
            .When(command => command.ReferenceContacts is null
                || command.ReferenceContacts.Count <= Client.MaxReferenceContacts);
    }
}

public sealed class GuardianInputValidator : AbstractValidator<GuardianInput>
{
    public GuardianInputValidator()
    {
        RuleFor(guardian => guardian.Name)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithErrorCode(ClientContact.NameRequired.Code)
            .WithMessage("O nome do responsável é obrigatório.")
            .Must(name => name.Trim().Length >= ClientContact.NameMinLength)
            .WithErrorCode(ClientContact.InvalidNameLength.Code)
            .WithMessage($"O nome do responsável deve ter pelo menos {ClientContact.NameMinLength} caracteres.")
            .Must(name => name.Trim().Length <= ClientContact.NameMaxLength)
            .WithErrorCode(ClientContact.InvalidNameLength.Code)
            .WithMessage($"O nome do responsável deve ter no máximo {ClientContact.NameMaxLength} caracteres.");

        RuleFor(guardian => guardian.Relationship)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithErrorCode(ClientContact.RelationshipRequired.Code)
            .WithMessage("O vínculo do responsável é obrigatório.")
            .Must(relationship => relationship.Trim().Length <= ClientContact.RelationshipMaxLength)
            .WithErrorCode(ClientContact.RelationshipTooLong.Code)
            .WithMessage($"O vínculo do responsável deve ter no máximo {ClientContact.RelationshipMaxLength} caracteres.");
    }
}

public sealed class ReferenceContactInputValidator : AbstractValidator<ReferenceContactInput>
{
    public ReferenceContactInputValidator()
    {
        RuleFor(contact => contact.Relationship)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithErrorCode(ClientContact.RelationshipRequired.Code)
            .WithMessage("O vínculo da pessoa de referência é obrigatório.")
            .Must(relationship => relationship.Trim().Length <= ClientContact.RelationshipMaxLength)
            .WithErrorCode(ClientContact.RelationshipTooLong.Code)
            .WithMessage($"O vínculo da pessoa de referência deve ter no máximo {ClientContact.RelationshipMaxLength} caracteres.");

        RuleFor(contact => contact.Purposes)
            .Must(purposes => purposes is { Count: > 0 })
            .WithErrorCode(ClientReferenceContact.PurposesRequired.Code)
            .WithMessage("Informe ao menos uma finalidade para a pessoa de referência.");

        RuleForEach(contact => contact.Purposes)
            .IsInEnum()
            .WithErrorCode(ClientReferenceContact.PurposeUnknown.Code)
            .WithMessage("Informe apenas finalidades válidas para a pessoa de referência.");
    }
}
