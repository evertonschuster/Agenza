using System.Reflection;

namespace Admin.SharedKernel.ValueObjects;

public static class StringValueObjects
{
    public static bool Is(Type type) =>
        type is { IsClass: true, IsAbstract: false }
        && type.GetInterfaces().Any(contract =>
            contract.IsGenericType
            && contract.GetGenericTypeDefinition() == typeof(IStringValueObject<>)
            && contract.GenericTypeArguments[0] == type);

    public static IEnumerable<Type> InThisProject() =>
        typeof(IStringValueObject<>).Assembly.GetExportedTypes().Where(Is);
}
