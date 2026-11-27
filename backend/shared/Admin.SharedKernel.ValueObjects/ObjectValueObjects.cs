using System.Collections.Concurrent;
using System.Reflection;
using System.Text.Json;

namespace Admin.SharedKernel.ValueObjects;

public static class ObjectValueObjects
{
    public static bool Is(Type type) => ValueObjectContract.Implements(type, typeof(IObjectValueObject<>));

    private static readonly ConcurrentDictionary<Type, MethodInfo> Creates = new();
    private static readonly ConcurrentDictionary<Type, IReadOnlyList<ObjectPart>> Parts = new();

    // The value object's single public static Create is its wire contract: its parameters are the parts.
    public static MethodInfo CreateOf(Type valueObject) => Creates.GetOrAdd(valueObject, FindCreate);

    private static MethodInfo FindCreate(Type valueObject)
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
        Parts.GetOrAdd(valueObject, type => CreateOf(type)
            .GetParameters()
            .Select(parameter => new ObjectPart(parameter.Name!, !parameter.HasDefaultValue))
            .ToList());

    // The JSON name of a part: the property named like the Create parameter, run through the naming policy.
    public static string WireNameOf(Type valueObject, string parameterName, JsonNamingPolicy? namingPolicy)
    {
        var name = valueObject
            .GetProperty(parameterName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)?.Name
            ?? parameterName;

        return namingPolicy?.ConvertName(name) ?? name;
    }

    public static IEnumerable<Type> InAssembly(Assembly assembly) =>
        assembly.GetExportedTypes().Where(Is);
}

public sealed record ObjectPart(string Name, bool Required);
