using FluentValidation;

namespace ServicesService.Application.Clients.CreateClient;

public sealed class CreateClientCommandValidator : AbstractValidator<CreateClientCommand>
{
    public CreateClientCommandValidator(TimeProvider timeProvider)
    {
        DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        RuleFor(command => command.Guardians).MustNotExceedTheGuardianLimit();

        RuleFor(command => command.Guardians)
            .MustHaveAGuardian()
            .When(command => command.BirthDate is { } birthDate && birthDate.IsMinorOn(Today()));

        RuleForEach(command => command.Guardians)
            .NotNull()
            .WithErrorCode(ClientRuleBuilderExtensions.GuardianMissingCode)
            .WithMessage("Informe os dados do responsável.")
            .SetValidator(new GuardianInputValidator())
            .When(command => command.Guardians is null || command.Guardians.Count <= Client.MaxGuardians);

        RuleFor(command => command.ReferenceContacts).MustNotExceedTheReferenceContactLimit();

        RuleForEach(command => command.ReferenceContacts)
            .NotNull()
            .WithErrorCode(ClientRuleBuilderExtensions.ReferenceContactMissingCode)
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
        RuleFor(contact => contact.Purposes).MustHaveValidPurposes();
    }
}
