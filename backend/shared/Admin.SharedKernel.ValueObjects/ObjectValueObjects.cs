using System.Reflection;

namespace Admin.SharedKernel.ValueObjects;

public static class ObjectValueObjects
{
    public static bool Is(Type type) => ValueObjectContract.Implements(type, typeof(IObjectValueObject<,>));

    public static Type InputOf(Type valueObject) =>
        valueObject.GetInterfaces()
            .Single(implementedInterface =>
                implementedInterface.IsGenericType
                && implementedInterface.GetGenericTypeDefinition() == typeof(IObjectValueObject<,>)
                && implementedInterface.GenericTypeArguments[0] == valueObject)
            .GenericTypeArguments[1];

    // A part is required when its constructor parameter has no default value; a default makes it optional.
    public static IReadOnlyList<ObjectPart> PartsOf(Type valueObject)
    {
        var input = InputOf(valueObject);
        var parameters = input.GetConstructors()
            .OrderByDescending(constructor => constructor.GetParameters().Length)
            .First()
            .GetParameters();

        return input.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(property => new ObjectPart(
                property.Name,
                parameters.Any(parameter =>
                    string.Equals(parameter.Name, property.Name, StringComparison.OrdinalIgnoreCase)
                    && !parameter.HasDefaultValue)))
            .ToList();
    }

    public static IEnumerable<Type> InThisProject() => ValueObjectContract.InThisProject(typeof(IObjectValueObject<,>));

    public static IEnumerable<Type> InAssembly(Assembly assembly) =>
        assembly.GetExportedTypes().Where(Is);
}

public sealed record ObjectPart(string Name, bool Required);
