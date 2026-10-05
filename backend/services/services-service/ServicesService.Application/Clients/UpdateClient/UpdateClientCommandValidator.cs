using FluentValidation;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients.UpdateClient;

public sealed class UpdateClientCommandValidator : AbstractValidator<UpdateClientCommand>
{
    public UpdateClientCommandValidator(TimeProvider timeProvider)
    {
        DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        RuleFor(command => command.ClientId)
            .NotEmpty()
            .WithErrorCode("Client.IdRequired")
            .WithMessage("O id da pessoa é obrigatório.");

        RuleFor(command => command.FullName).MustBeValidFullName();
        RuleFor(command => command.BirthDate).MustBeValidBirthDate(Today);
        RuleFor(command => command.Phone).MustBeValidPhone();
        RuleFor(command => command.Email).MustBeValidEmail();
        RuleFor(command => command.Cpf).MustBeValidCpf();
        RuleFor(command => command.AdministrativeNotes).MustBeValidAdministrativeNotes();

        RuleFor(command => command.Guardians).MustNotExceedTheGuardianLimit();

        RuleFor(command => command.Guardians)
            .MustHaveAGuardian()
            .When(command => command.BirthDate is { } birthDate
                && BirthDate.IsMinorOn(birthDate, Today()));

        RuleFor(command => command.Guardians)
            .Must(guardians => HasDistinctIds(guardians, guardian => guardian.Id))
            .WithErrorCode(Client.DuplicateContact.Code)
            .WithMessage(Client.DuplicateContact.Message);

        RuleForEach(command => command.Guardians)
            .NotNull()
            .WithErrorCode(ClientRuleBuilderExtensions.GuardianMissingCode)
            .WithMessage("Informe os dados do responsável.")
            .SetValidator(new UpdateGuardianInputValidator())
            .When(command => command.Guardians is null || command.Guardians.Count <= Client.MaxGuardians);

        RuleFor(command => command.ReferenceContacts).MustNotExceedTheReferenceContactLimit();

        RuleFor(command => command.ReferenceContacts)
            .Must(contacts => HasDistinctIds(contacts, contact => contact.Id))
            .WithErrorCode(Client.DuplicateContact.Code)
            .WithMessage(Client.DuplicateContact.Message);

        RuleForEach(command => command.ReferenceContacts)
            .NotNull()
            .WithErrorCode(ClientRuleBuilderExtensions.ReferenceContactMissingCode)
            .WithMessage("Informe os dados da pessoa de referência.")
            .SetValidator(new UpdateReferenceContactInputValidator())
            .When(command => command.ReferenceContacts is null
                || command.ReferenceContacts.Count <= Client.MaxReferenceContacts);
    }

    private static bool HasDistinctIds<TItem>(IReadOnlyList<TItem?>? items, Func<TItem, Guid?> id)
        where TItem : class
    {
        var ids = (items ?? []).OfType<TItem>().Select(id).Where(value => value.HasValue).ToList();
        return ids.Distinct().Count() == ids.Count;
    }
}

public sealed class UpdateGuardianInputValidator : AbstractValidator<UpdateGuardianInput>
{
    public UpdateGuardianInputValidator()
    {
        RuleFor(guardian => guardian.Name).MustBeValidContactName("do responsável");
        RuleFor(guardian => guardian.Relationship).MustBeValidContactRelationship("do responsável");
        RuleFor(guardian => guardian.Phone).MustBeValidPhone();
        RuleFor(guardian => guardian.Cpf).MustBeValidCpf();
    }
}

public sealed class UpdateReferenceContactInputValidator : AbstractValidator<UpdateReferenceContactInput>
{
    public UpdateReferenceContactInputValidator()
    {
        RuleFor(contact => contact.Name).MustBeValidContactName("da pessoa de referência");
        RuleFor(contact => contact.Relationship).MustBeValidContactRelationship("da pessoa de referência");
        RuleFor(contact => contact.Phone).MustBeValidPhone();
        RuleFor(contact => contact.Purposes).MustHaveValidPurposes();
    }
}
