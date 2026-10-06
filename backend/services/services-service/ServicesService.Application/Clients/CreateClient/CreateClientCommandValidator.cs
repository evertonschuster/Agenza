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
        RuleFor(guardian => guardian.Name).MustBeValidContactName("do responsável");
        RuleFor(guardian => guardian.Relationship).MustBeValidContactRelationship("do responsável");
    }
}

public sealed class ReferenceContactInputValidator : AbstractValidator<ReferenceContactInput>
{
    public ReferenceContactInputValidator()
    {
        RuleFor(contact => contact.Relationship).MustBeValidContactRelationship("da pessoa de referência");

        RuleFor(contact => contact.Purposes)
            .Cascade(CascadeMode.Stop)
            .Must(purposes => purposes is { Count: > 0 })
            .WithErrorCode(ContactPurposes.Required.Code)
            .WithMessage("Informe ao menos uma finalidade para a pessoa de referência.")
            .Must(ContactPurposeNames.AreKnown)
            .WithErrorCode(ContactPurposeNames.UnknownCode)
            .WithMessage(ContactPurposeNames.UnknownMessage);
    }
}
