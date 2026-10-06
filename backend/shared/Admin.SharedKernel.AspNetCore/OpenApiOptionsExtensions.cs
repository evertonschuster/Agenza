using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Admin.SharedKernel.AspNetCore;

public static class OpenApiOptionsExtensions
{
    public static OpenApiOptions MapValueObjectsToStrings(this OpenApiOptions options)
    {
        options.CreateSchemaReferenceId = typeInfo => StringValueObjects.Is(typeInfo.Type)
            ? null
            : OpenApiOptions.CreateDefaultSchemaReferenceId(typeInfo);

        options.AddSchemaTransformer((schema, context, _) =>
        {
            if (!StringValueObjects.Is(context.JsonTypeInfo.Type))
            {
                return Task.CompletedTask;
            }

            var nullable = schema.Type is { } type && type.HasFlag(JsonSchemaType.Null);
            schema.Type = nullable ? JsonSchemaType.String | JsonSchemaType.Null : JsonSchemaType.String;
            schema.Properties = null;

            return Task.CompletedTask;
        });

        return options;
    }
}
