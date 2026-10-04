using FluentValidation;
using ServicesService.Domain.Common;
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

    public static IRuleBuilderOptions<T, string?> MustBeValidInternalDescription<T>(
        this IRuleBuilder<T, string?> rule)
    {
        return rule.Must(description => description is null || description.Trim().Length <= Service.InternalDescriptionMaxLength)
            .WithErrorCode(Service.InternalDescriptionTooLong.Code)
            .WithMessage($"A descrição interna deve ter no máximo {Service.InternalDescriptionMaxLength} caracteres.");
    }

    public static IRuleBuilderOptions<T, string?> MustBeValidClientDescription<T>(
        this IRuleBuilder<T, string?> rule)
    {
        return rule.Must(description => description is null || description.Trim().Length <= Service.ClientDescriptionMaxLength)
            .WithErrorCode(Service.ClientDescriptionTooLong.Code)
            .WithMessage($"A descrição para o cliente deve ter no máximo {Service.ClientDescriptionMaxLength} caracteres.");
    }

    public static IRuleBuilderOptions<T, int> MustBeValidDuration<T>(this IRuleBuilder<T, int> rule)
    {
        return rule.Must(ServiceDuration.IsAllowedDuration)
            .WithErrorCode(ServiceDuration.DurationOutOfRange.Code)
            .WithMessage(
                $"A duração do serviço deve ser de {ServiceDuration.MinAllowedMinutes} a {ServiceDuration.MaxAllowedMinutes} minutos.");
    }

    public static IRuleBuilderOptions<T, int?> MustBeValidPreparation<T>(this IRuleBuilder<T, int?> rule)
    {
        return rule.MustBeValidBuffer(ServiceDuration.PreparationOutOfRange, "O tempo de preparo");
    }

    public static IRuleBuilderOptions<T, int?> MustBeValidCleanup<T>(this IRuleBuilder<T, int?> rule)
    {
        return rule.MustBeValidBuffer(ServiceDuration.CleanupOutOfRange, "O tempo de limpeza");
    }

    public static IRuleBuilderOptions<T, int?> MustBeValidMinDuration<T>(this IRuleBuilder<T, int?> rule)
    {
        return rule.Must(minutes => minutes is null || ServiceDuration.IsAllowedDuration(minutes.Value))
            .WithErrorCode(ServiceDuration.MinOutOfRange.Code)
            .WithMessage(
                $"A duração mínima deve ser de {ServiceDuration.MinAllowedMinutes} a {ServiceDuration.MaxAllowedMinutes} minutos.");
    }

    public static IRuleBuilderOptions<T, int?> MustBeValidMaxDuration<T>(
        this IRuleBuilderInitial<T, int?> rule,
        Func<T, int?> minDuration)
    {
        return rule.Cascade(CascadeMode.Stop)
            .Must(minutes => minutes is null || ServiceDuration.IsAllowedDuration(minutes.Value))
            .WithErrorCode(ServiceDuration.MaxOutOfRange.Code)
            .WithMessage(
                $"A duração máxima deve ser de {ServiceDuration.MinAllowedMinutes} a {ServiceDuration.MaxAllowedMinutes} minutos.")
            .Must((command, maxDuration) => maxDuration is null || minDuration(command) is null || minDuration(command) <= maxDuration)
            .WithErrorCode(ServiceDuration.MinGreaterThanMax.Code)
            .WithMessage("A duração mínima não pode ser maior que a duração máxima.");
    }

    public static IRuleBuilderOptions<T, int> MustBeWithinTheDurationLimits<T>(
        this IRuleBuilder<T, int> rule,
        Func<T, int?> minDuration,
        Func<T, int?> maxDuration)
    {
        return rule.Must((command, duration) => minDuration(command) is not { } minimum || duration >= minimum)
            .WithErrorCode(ServiceDuration.DurationBelowMin.Code)
            .WithMessage("A duração do serviço não pode ser menor que a duração mínima.")
            .Must((command, duration) => maxDuration(command) is not { } maximum || duration <= maximum)
            .WithErrorCode(ServiceDuration.DurationAboveMax.Code)
            .WithMessage("A duração do serviço não pode ser maior que a duração máxima.");
    }

    public static IRuleBuilderOptions<T, string> MustBeAKnownPricingType<T>(this IRuleBuilder<T, string> rule)
    {
        return rule.Must(PricingTypeNames.IsKnown)
            .WithErrorCode(PricingTypeNames.UnknownCode)
            .WithMessage(PricingTypeNames.UnknownMessage);
    }

    public static IRuleBuilderOptions<T, decimal?> MustMatchThePricingType<T>(
        this IRuleBuilder<T, decimal?> rule,
        Func<T, string?> pricingType)
    {
        return rule.Must((command, price) => price is not null || PricingTypeNames.ToPricingType(pricingType(command)) != PricingType.Fixed)
            .WithErrorCode(Service.PriceRequired.Code)
            .WithMessage("Informe o valor do serviço de preço fixo.")
            .Must((command, price) => price is null || PricingTypeNames.ToPricingType(pricingType(command)) != PricingType.Variable)
            .WithErrorCode(Service.PriceNotAllowed.Code)
            .WithMessage("O serviço de preço variável não tem valor fixo.");
    }

    public static IRuleBuilderOptions<T, decimal?> MustBeValidPrice<T>(this IRuleBuilderInitial<T, decimal?> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .Must(price => price is null || price >= 0)
            .WithErrorCode(Money.Negative.Code)
            .WithMessage("O preço do serviço não pode ser negativo.")
            .Must(price => price is null || Money.HasValidPrecision(price.Value))
            .WithErrorCode(Money.InvalidPrecision.Code)
            .WithMessage(
                $"O preço deve ter no máximo {Money.Precision - Money.Scale} dígitos inteiros e {Money.Scale} casas decimais.");
    }

    public static IRuleBuilderOptions<T, decimal?> MustBeValidMaxDiscount<T>(
        this IRuleBuilderInitial<T, decimal?> rule)
    {
        return rule.Cascade(CascadeMode.Stop)
            .Must(percentage => percentage is null || Percentage.IsInRange(percentage.Value))
            .WithErrorCode(Percentage.OutOfRange.Code)
            .WithMessage($"O desconto máximo do serviço deve ficar entre {Percentage.Minimum} e {Percentage.Maximum}.")
            .Must(percentage => percentage is null || Percentage.HasValidScale(percentage.Value))
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

    private static IRuleBuilderOptions<T, int?> MustBeValidBuffer<T>(
        this IRuleBuilder<T, int?> rule,
        DomainError error,
        string subject)
    {
        return rule.Must(minutes => minutes is null || ServiceDuration.IsAllowedBuffer(minutes.Value))
            .WithErrorCode(error.Code)
            .WithMessage(
                $"{subject} deve ser de {ServiceDuration.MinBufferMinutes} a {ServiceDuration.MaxAllowedMinutes} minutos.");
    }
}
