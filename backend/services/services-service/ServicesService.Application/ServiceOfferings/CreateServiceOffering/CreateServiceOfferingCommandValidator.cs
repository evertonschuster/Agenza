using FluentValidation;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.ServiceOfferings.CreateServiceOffering;

public sealed class CreateServiceOfferingCommandValidator : AbstractValidator<CreateServiceOfferingCommand>
{
    public CreateServiceOfferingCommandValidator()
    {
        RuleFor(command => command.Name)
            .NotEmpty().WithMessage("O nome do serviço é obrigatório.")
            .MaximumLength(ServiceOffering.NameMaxLength)
            .WithMessage($"O nome do serviço deve ter no máximo {ServiceOffering.NameMaxLength} caracteres.");

        RuleFor(command => command.Description)
            .MaximumLength(ServiceOffering.DescriptionMaxLength)
            .WithMessage(
                $"A descrição do serviço deve ter no máximo {ServiceOffering.DescriptionMaxLength} caracteres.");

        RuleFor(command => command.DurationMinutes)
            .InclusiveBetween(1, ServiceOffering.MaxDurationMinutes)
            .WithMessage($"A duração do serviço deve ser entre 1 e {ServiceOffering.MaxDurationMinutes} minutos.");

        RuleFor(command => command.Price)
            .GreaterThanOrEqualTo(0).WithMessage("O preço do serviço não pode ser negativo.");
    }
}
