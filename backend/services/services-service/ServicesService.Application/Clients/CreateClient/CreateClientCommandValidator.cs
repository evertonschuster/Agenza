using FluentValidation;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients.CreateClient;

public sealed class CreateClientCommandValidator : AbstractValidator<CreateClientCommand>
{
    public CreateClientCommandValidator(TimeProvider timeProvider)
    {
        DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        RuleFor(command => command.FullName).MustBeValid(FullName.Create);
        RuleFor(command => command.BirthDate).MustBeValid(birthDate => BirthDate.Create(birthDate, Today()));
        RuleFor(command => command.Phone).MustBeValid(PhoneNumber.Create);
        RuleFor(command => command.Email).MustBeValid(EmailAddress.Create);
        RuleFor(command => command.Cpf).MustBeValid(CpfNumber.Create);
        RuleFor(command => command.AdministrativeNotes).MustBeValid(AdministrativeNotes.Create);

        RuleFor(command => command.Guardians)
            .MustBeValid((command, guardians) =>
                Client.ValidateGuardians(command.BirthDate, Today(), guardians?.Count ?? 0));

        RuleForEach(command => command.Guardians)
            .NotNull()
            .WithErrorCode("Client.GuardianMissing")
            .WithMessage("Informe os dados do responsável.")
            .SetValidator(new GuardianInputValidator())
            .When(command => command.Guardians is null || command.Guardians.Count <= Client.MaxGuardians);

        RuleFor(command => command.ReferenceContacts)
            .MustBeValid(contacts => Client.ValidateReferenceContacts(contacts?.Count ?? 0));

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
        RuleFor(guardian => guardian.Name).MustBeValid(ClientContact.ValidateName);
        RuleFor(guardian => guardian.Relationship).MustBeValid(ClientContact.ValidateRelationship);
        RuleFor(guardian => guardian.Phone).MustBeValid(PhoneNumber.Create);
        RuleFor(guardian => guardian.Cpf).MustBeValid(CpfNumber.Create);
    }
}

public sealed class ReferenceContactInputValidator : AbstractValidator<ReferenceContactInput>
{
    public ReferenceContactInputValidator()
    {
        RuleFor(contact => contact.Name).MustBeValid(ClientContact.ValidateName);
        RuleFor(contact => contact.Relationship).MustBeValid(ClientContact.ValidateRelationship);
        RuleFor(contact => contact.Phone).MustBeValid(PhoneNumber.Create);
        RuleFor(contact => contact.Purposes)
            .Cascade(CascadeMode.Stop)
            .Must(ContactPurposeNames.AreKnown)
            .WithErrorCode(ContactPurposeNames.UnknownCode)
            .WithMessage(ContactPurposeNames.UnknownMessage)
            .MustBeValid(purposes => ContactPurposes.Create(ContactPurposeNames.ToPurposes(purposes)));
    }
}
