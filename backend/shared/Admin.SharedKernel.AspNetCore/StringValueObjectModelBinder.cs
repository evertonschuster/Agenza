using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Admin.SharedKernel.AspNetCore;

internal sealed class StringValueObjectModelBinder<T> : IModelBinder
    where T : class, IStringValueObject<T>
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var modelName = bindingContext.ModelName;
        var valueProviderResult = bindingContext.ValueProvider.GetValue(modelName);
        if (valueProviderResult == ValueProviderResult.None)
        {
            return Task.CompletedTask;
        }

        bindingContext.ModelState.SetModelValue(modelName, valueProviderResult);

        var raw = valueProviderResult.FirstValue;
        if (string.IsNullOrWhiteSpace(raw) && T.BlankIsAbsent)
        {
            bindingContext.Result = ModelBindingResult.Success(null);
            return Task.CompletedTask;
        }

        var result = T.Create(raw);
        if (result.IsFailure)
        {
            bindingContext.ModelState.TryAddModelError(modelName, result.Error);
            return Task.CompletedTask;
        }

        bindingContext.Result = ModelBindingResult.Success(result.Value);
        return Task.CompletedTask;
    }
}
