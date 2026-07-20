using FluentValidation;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.UpdateService;

public sealed class UpdateServiceCommandValidator : AbstractValidator<UpdateServiceCommand>
{
    public UpdateServiceCommandValidator(
        IServiceRepository serviceRepository,
        ICategoryRepository categoryRepository,
        ITagRepository tagRepository)
    {
        RuleFor(command => command.ServiceId)
            .NotEmpty().WithMessage("O id do serviço é obrigatório.");

        RuleFor(command => command.ServiceId)
            .MustAsync(async (id, ct) => await serviceRepository.GetByIdAsync(id, ct) is not null)
            .WithErrorCode("Service.NotFound")
            .WithMessage(command => $"Serviço '{command.ServiceId}' não foi encontrado.");

        RuleFor(command => command.Name)
            .NotEmpty().WithMessage("O nome do serviço é obrigatório.")
            .MaximumLength(Service.NameMaxLength)
            .WithMessage($"O nome do serviço deve ter no máximo {Service.NameMaxLength} caracteres.");

        RuleFor(command => command)
            .MustAsync(async (command, ct) => !await serviceRepository.NameExistsAsync(command.Name, command.ServiceId, ct))
            .WithErrorCode("Service.DuplicateName")
            .WithMessage(command => $"Já existe um serviço chamado '{command.Name}'.")
            .OverridePropertyName(nameof(UpdateServiceCommand.Name));

        RuleFor(command => command.CategoryId)
            .MustAsync(async (id, ct) => await categoryRepository.GetByIdAsync(id!.Value, ct) is not null)
            .When(command => command.CategoryId is not null)
            .WithErrorCode("Category.NotFound")
            .WithMessage(command => $"Categoria '{command.CategoryId}' não foi encontrada.");

        RuleFor(command => command.TagIds)
            .MustAsync(async (ids, ct) => (await tagRepository.GetByIdsAsync(ids!, ct)).Count == ids!.Count)
            .When(command => command.TagIds is not null)
            .WithErrorCode("Tag.NotFound")
            .WithMessage("Uma ou mais etiquetas informadas não foram encontradas.");

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
            .GreaterThanOrEqualTo(0).WithMessage("O preço do serviço não pode ser negativo.");

        RuleFor(command => command.MaxDiscountPercentage)
            .InclusiveBetween(0, 100)
            .WithMessage("O desconto máximo do serviço deve ser entre 0 e 100.");
    }
}
