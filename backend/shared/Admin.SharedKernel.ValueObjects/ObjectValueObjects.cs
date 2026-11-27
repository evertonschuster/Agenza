using System.Reflection;

namespace Admin.SharedKernel.ValueObjects;

public static class ObjectValueObjects
{
    public static bool Is(Type type) => ValueObjectContract.Implements(type, typeof(IObjectValueObject<>));

    // The value object's single public static Create is its wire contract: its parameters are the parts.
    public static MethodInfo CreateOf(Type valueObject)
    {
        var candidates = valueObject
            .GetMethods(BindingFlags.Public | BindingFlags.Static)
            .Where(method => method.Name == "Create")
            .ToList();

        if (candidates.Count != 1 || candidates[0].ReturnType != typeof(ParseResult<>).MakeGenericType(valueObject))
        {
            throw new InvalidOperationException(
                $"{valueObject.Name} must declare exactly one public static Create returning ParseResult<{valueObject.Name}>.");
        }

        return candidates[0];
    }

    // A part is required when its Create parameter has no default value; a default makes it optional.
    public static IReadOnlyList<ObjectPart> PartsOf(Type valueObject) =>
        CreateOf(valueObject)
            .GetParameters()
            .Select(parameter => new ObjectPart(parameter.Name!, !parameter.HasDefaultValue))
            .ToList();

    public static IEnumerable<Type> InAssembly(Assembly assembly) =>
        assembly.GetExportedTypes().Where(Is);
}

public sealed record ObjectPart(string Name, bool Required);
