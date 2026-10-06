using Admin.SharedKernel.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Admin.SharedKernel.EntityFrameworkCore;

public static class ModelConfigurationBuilderExtensions
{
    public static ModelConfigurationBuilder AddValueObjectConversions(this ModelConfigurationBuilder configurationBuilder)
    {
        foreach (var valueObject in StringValueObjects.InThisProject())
        {
            configurationBuilder.Properties(valueObject)
                .HaveConversion(typeof(StringValueObjectConverter<>).MakeGenericType(valueObject));
        }

        foreach (var valueObject in DateValueObjects.InThisProject())
        {
            configurationBuilder.Properties(valueObject)
                .HaveConversion(typeof(DateValueObjectConverter<>).MakeGenericType(valueObject));
        }

        return configurationBuilder;
    }
}
