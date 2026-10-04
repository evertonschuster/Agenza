using FluentValidation;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Services;

public static class ServiceRuleBuilderExtensions
{
    private const string IdRequiredCode = "Service.IdRequired";

    public static IRuleBuilderOptions<T, Guid> MustBeAServiceId<T>(this IRuleBuilder<T, Guid> rule)
    {
        return rule.NotEmpty()
            .WithErrorCode(IdRequiredCode)
            .WithMessage("O id do serviço é obrigatório.");
    }

    public static IRuleBuilderOptions<T, string> MustBeValidName<T>(this IRuleBuilderInitial<T, string> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .NotEmpty()
            .WithErrorCode(Service.NameRequired.Code)
            .WithMessage("O nome do serviço é obrigatório.")
            .Must(name => name.Trim().Length <= Service.NameMaxLength)
            .WithErrorCode(Service.NameTooLong.Code)
            .WithMessage($"O nome do serviço deve ter no máximo {Service.NameMaxLength} caracteres.");
    }

    public static IRuleBuilderOptions<T, string?> MustBeValidDescription<T>(this IRuleBuilder<T, string?> rule)
    {
        return rule.Must(description => description is null || description.Trim().Length <= Service.DescriptionMaxLength)
            .WithErrorCode(Service.DescriptionTooLong.Code)
            .WithMessage($"A descrição do serviço deve ter no máximo {Service.DescriptionMaxLength} caracteres.");
    }

    public static IRuleBuilderOptions<T, int> MustBeValidMinDuration<T>(this IRuleBuilder<T, int> rule)
    {
        return rule.GreaterThanOrEqualTo(DurationRange.MinAllowedMinutes)
            .WithErrorCode(DurationRange.MinOutOfRange.Code)
            .WithMessage($"A duração mínima do serviço deve ser de pelo menos {DurationRange.MinAllowedMinutes} minuto.");
    }

    public static IRuleBuilderOptions<T, int> MustBeValidMaxDuration<T>(
        this IRuleBuilderInitial<T, int> rule,
        Func<T, int> minDuration)
    {
        return rule.Cascade(CascadeMode.Stop)
            .LessThanOrEqualTo(DurationRange.MaxAllowedMinutes)
            .WithErrorCode(DurationRange.MaxOutOfRange.Code)
            .WithMessage($"A duração máxima do serviço não pode ultrapassar {DurationRange.MaxAllowedMinutes} minutos.")
            .Must((command, maxDuration) => minDuration(command) <= maxDuration)
            .WithErrorCode(DurationRange.MinGreaterThanMax.Code)
            .WithMessage("A duração mínima do serviço não pode ser maior que a duração máxima.");
    }

    public static IRuleBuilderOptions<T, int> MustBeWithinTheDurationRange<T>(
        this IRuleBuilder<T, int> rule,
        Func<T, int> minDuration,
        Func<T, int> maxDuration)
    {
        return rule.Must((command, duration) => duration >= minDuration(command) && duration <= maxDuration(command))
            .WithErrorCode(DurationRange.DurationOutsideRange.Code)
            .WithMessage("A duração do serviço deve estar entre a duração mínima e a duração máxima.");
    }

    public static IRuleBuilderOptions<T, decimal> MustBeValidPrice<T>(this IRuleBuilderInitial<T, decimal> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .GreaterThanOrEqualTo(0)
            .WithErrorCode(Money.Negative.Code)
            .WithMessage("O preço do serviço não pode ser negativo.")
            .Must(Money.HasValidPrecision)
            .WithErrorCode(Money.InvalidPrecision.Code)
            .WithMessage(
                $"O preço deve ter no máximo {Money.Precision - Money.Scale} dígitos inteiros e {Money.Scale} casas decimais.");
    }

    public static IRuleBuilderOptions<T, decimal> MustBeValidMaxDiscount<T>(this IRuleBuilderInitial<T, decimal> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .Must(Percentage.IsInRange)
            .WithErrorCode(Percentage.OutOfRange.Code)
            .WithMessage($"O desconto máximo do serviço deve ficar entre {Percentage.Minimum} e {Percentage.Maximum}.")
            .Must(Percentage.HasValidScale)
            .WithErrorCode(Percentage.TooManyDecimals.Code)
            .WithMessage($"O desconto máximo deve ter no máximo {Percentage.Scale} casas decimais.");
    }

    public static IRuleBuilderOptions<T, IReadOnlyList<Guid>?> MustBeValidTagIds<T>(
        this IRuleBuilderInitial<T, IReadOnlyList<Guid>?> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .Must(tagIds => tagIds is null || tagIds.Count <= Service.MaxTags)
            .WithErrorCode(Service.TooManyTags.Code)
            .WithMessage($"Informe no máximo {Service.MaxTags} etiquetas.")
            .Must(tagIds => tagIds is null || tagIds.All(tagId => tagId != Guid.Empty))
            .WithErrorCode(Service.InvalidTag.Code)
            .WithMessage("Informe etiquetas válidas.")
            .Must(tagIds => tagIds is null || tagIds.Distinct().Count() == tagIds.Count)
            .WithErrorCode(Service.DuplicateTags.Code)
            .WithMessage("A mesma etiqueta não pode ser informada mais de uma vez.");
    }
}
