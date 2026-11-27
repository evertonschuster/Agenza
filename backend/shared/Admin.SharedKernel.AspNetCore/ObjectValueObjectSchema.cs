using Microsoft.OpenApi;

namespace Admin.SharedKernel.AspNetCore;

public static class ObjectValueObjectSchema
{
    public static void Apply(OpenApiSchema schema, Type valueObject)
    {
        if (schema.Properties is not { } properties)
        {
            return;
        }

        var parts = ObjectValueObjects.PartsOf(valueObject);

        foreach (var name in properties.Keys.Where(name => !parts.Any(part => Matches(part, name))).ToList())
        {
            properties.Remove(name);
        }

        var required = properties.Keys
            .Where(name => parts.Any(part => part.Required && Matches(part, name)))
            .ToHashSet();

        schema.Required = required.Count > 0 ? required : null;
    }

    private static bool Matches(ObjectPart part, string name) =>
        string.Equals(part.Name, name, StringComparison.OrdinalIgnoreCase);
}
