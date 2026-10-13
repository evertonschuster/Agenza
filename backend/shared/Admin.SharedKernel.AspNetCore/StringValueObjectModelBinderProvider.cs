using Microsoft.AspNetCore.Mvc.ModelBinding;
using System.ComponentModel;

namespace Admin.SharedKernel.AspNetCore;

internal sealed class StringValueObjectModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context.BindingInfo.BindingSource == BindingSource.Body)
        {
            return null;
        }

        var modelType = context.Metadata.ModelType;
        if (!StringValueObjects.Is(modelType) || !ReadsFromText(modelType))
        {
            return null;
        }

        var binderType = typeof(StringValueObjectModelBinder<>).MakeGenericType(modelType);

        return (IModelBinder)Activator.CreateInstance(binderType)!;
    }

    private static bool ReadsFromText(Type modelType)
    {
        var converterType = TypeDescriptor.GetConverter(modelType).GetType();

        return converterType.IsGenericType
            && converterType.GetGenericTypeDefinition() == typeof(StringValueObjectTypeConverter<>);
    }
}
