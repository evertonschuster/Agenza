using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Admin.SharedKernel.AspNetCore;

public static class OpenApiOptionsExtensions
{
    public static OpenApiOptions MapValueObjectsToStrings(this OpenApiOptions options)
    {
        options.CreateSchemaReferenceId = typeInfo => IsValueObject(typeInfo.Type)
            ? null
            : OpenApiOptions.CreateDefaultSchemaReferenceId(typeInfo);

        options.AddSchemaTransformer((schema, context, _) =>
        {
            var valueObject = context.JsonTypeInfo.Type;

            if (!IsValueObject(valueObject))
            {
                return Task.CompletedTask;
            }

            var nullable = schema.Type is { } type && type.HasFlag(JsonSchemaType.Null);
            schema.Type = nullable ? JsonSchemaType.String | JsonSchemaType.Null : JsonSchemaType.String;
            schema.Properties = null;

            if (DateValueObjects.Is(valueObject))
            {
                schema.Format = "date";
            }

            return Task.CompletedTask;
        });

        return options;
    }

    private static bool IsValueObject(Type type) => StringValueObjects.Is(type) || DateValueObjects.Is(type);
}
