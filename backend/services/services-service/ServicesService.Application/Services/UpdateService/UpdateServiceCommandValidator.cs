using FluentValidation;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.UpdateService;

public sealed class UpdateServiceCommandValidator : AbstractValidator<UpdateServiceCommand>
{
    public UpdateServiceCommandValidator()
    {
        RuleFor(command => command.ServiceId)
            .NotEmpty().WithMessage("O id do serviço é obrigatório.");

        RuleFor(command => command.Name)
            .NotEmpty().WithMessage("O nome do serviço é obrigatório.")
            .MaximumLength(Service.NameMaxLength)
            .WithMessage($"O nome do serviço deve ter no máximo {Service.NameMaxLength} caracteres.");

        RuleFor(command => command.Description)
            .MaximumLength(Service.DescriptionMaxLength)
            .WithMessage($"A descrição do serviço deve ter no máximo {Service.DescriptionMaxLength} caracteres.");

        RuleFor(command => command.MinDurationMinutes)
            .GreaterThanOrEqualTo(1)
            .WithMessage("A duração mínima do serviço deve ser de pelo menos 1 minuto.");

        RuleFor(command => command.MaxDurationMinutes)
            .LessThanOrEqualTo(Service.MaxAllowedDurationMinutes)
            .WithMessage(
                $"A duração máxima do serviço não pode ultrapassar {Service.MaxAllowedDurationMinutes} minutos.");

        RuleFor(command => command)
            .Must(command => command.MinDurationMinutes <= command.MaxDurationMinutes)
            .WithMessage("A duração mínima do serviço não pode ser maior que a duração máxima.")
            .OverridePropertyName(nameof(UpdateServiceCommand.MaxDurationMinutes));

        RuleFor(command => command)
            .Must(command => command.DurationMinutes >= command.MinDurationMinutes
                && command.DurationMinutes <= command.MaxDurationMinutes)
            .WithMessage("A duração do serviço deve estar entre a duração mínima e a duração máxima.")
            .OverridePropertyName(nameof(UpdateServiceCommand.DurationMinutes));

        RuleFor(command => command.Price)
            .GreaterThanOrEqualTo(0).WithMessage("O preço do serviço não pode ser negativo.")
            .PrecisionScale(10, 2, ignoreTrailingZeros: true)
            .WithMessage("O preço deve ter no máximo 8 dígitos inteiros e 2 casas decimais.");

        RuleFor(command => command.MaxDiscountPercentage)
            .InclusiveBetween(0, 100)
            .WithMessage("O desconto máximo do serviço deve ser entre 0 e 100.")
            .PrecisionScale(5, 2, ignoreTrailingZeros: true)
            .WithMessage("O desconto máximo deve ter no máximo 3 dígitos inteiros e 2 casas decimais.");

        RuleFor(command => command.TagIds)
            .Must(tagIds => tagIds is null || tagIds.Distinct().Count() == tagIds.Count)
            .WithMessage("A lista de etiquetas não pode conter ids duplicados.");
    }
}
