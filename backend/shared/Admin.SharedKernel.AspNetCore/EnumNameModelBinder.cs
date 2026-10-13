using Microsoft.AspNetCore.Mvc.ModelBinding;
using System.Text.Json;

namespace Admin.SharedKernel.AspNetCore;

internal sealed class EnumNameModelBinder<TEnum> : IModelBinder
    where TEnum : struct, Enum
{
    private static readonly string[] Names = Enum.GetNames<TEnum>();

    private static readonly string Invalid = $"O valor informado deve ser {Choices()}.";

    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var modelName = bindingContext.ModelName;
        var valueProviderResult = bindingContext.ValueProvider.GetValue(modelName);
        if (valueProviderResult == ValueProviderResult.None)
        {
            return Task.CompletedTask;
        }

        bindingContext.ModelState.SetModelValue(modelName, valueProviderResult);

        var raw = valueProviderResult.FirstValue?.Trim();
        if (string.IsNullOrEmpty(raw) && bindingContext.ModelMetadata.IsReferenceOrNullableType)
        {
            bindingContext.Result = ModelBindingResult.Success(null);
            return Task.CompletedTask;
        }

        var name = Array.Find(Names, candidate => string.Equals(candidate, raw, StringComparison.OrdinalIgnoreCase));
        if (name is null)
        {
            bindingContext.ModelState.TryAddModelError(modelName, Invalid);
            return Task.CompletedTask;
        }

        bindingContext.Result = ModelBindingResult.Success(Enum.Parse<TEnum>(name));
        return Task.CompletedTask;
    }

    private static string Choices()
    {
        var names = Names.Select(JsonNamingPolicy.CamelCase.ConvertName).ToArray();
        if (names.Length < 2)
        {
            return string.Concat(names);
        }

        return $"{string.Join(", ", names[..^1])} ou {names[^1]}";
    }
}
