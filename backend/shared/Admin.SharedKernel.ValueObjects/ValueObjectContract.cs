using System.Reflection;

namespace Admin.SharedKernel.ValueObjects;

internal static class ValueObjectContract
{
    public static bool Implements(Type type, Type contract) =>
        type is { IsClass: true, IsAbstract: false }
        && type.GetInterfaces().Any(implemented =>
            implemented.IsGenericType
            && implemented.GetGenericTypeDefinition() == contract
            && implemented.GenericTypeArguments[0] == type);

    public static IEnumerable<Type> InThisProject(Type contract) =>
        typeof(ValueObjectContract).Assembly.GetExportedTypes().Where(type => Implements(type, contract));
}
