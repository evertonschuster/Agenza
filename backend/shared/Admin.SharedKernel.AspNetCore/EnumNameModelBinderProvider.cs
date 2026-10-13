using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Admin.SharedKernel.AspNetCore;

internal sealed class EnumNameModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context.BindingInfo.BindingSource == BindingSource.Body)
        {
            return null;
        }

        var enumType = context.Metadata.UnderlyingOrModelType;
        if (!enumType.IsEnum)
        {
            return null;
        }

        var binderType = typeof(EnumNameModelBinder<>).MakeGenericType(enumType);

        return (IModelBinder)Activator.CreateInstance(binderType)!;
    }
}
