using FluentValidation;
using FluentValidation.Results;
using ServicesService.Domain.Common;

namespace ServicesService.Application.Abstractions;

public static class DomainRuleBuilderExtensions
{
    public static IRuleBuilderOptionsConditions<T, TProperty> MustBeValid<T, TProperty>(
        this IRuleBuilder<T, TProperty> rule,
        Func<TProperty, DomainResult> validate)
    {
        return rule.MustBeValid((_, value) => validate(value));
    }

    public static IRuleBuilderOptionsConditions<T, TProperty> MustBeValid<T, TProperty>(
        this IRuleBuilder<T, TProperty> rule,
        Func<T, TProperty, DomainResult> validate)
    {
        return rule.Custom((value, context) =>
        {
            var result = validate(context.InstanceToValidate, value);
            if (result.IsFailure)
            {
                context.AddFailure(new ValidationFailure(context.PropertyPath, result.Error.Message, value)
                {
                    ErrorCode = result.Error.Code,
                });
            }
        });
    }
}
