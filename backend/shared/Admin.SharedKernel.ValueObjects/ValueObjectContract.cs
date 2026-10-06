using System.Reflection;

namespace Admin.SharedKernel.ValueObjects;

internal static class ValueObjectContract
{
    public static bool Implements(Type type, Type contract)
    {
        if (!type.IsClass || type.IsAbstract)
            return false;

        return type.GetInterfaces().Any(implementedInterface =>
            implementedInterface.IsGenericType
            && implementedInterface.GetGenericTypeDefinition() == contract
            && implementedInterface.GenericTypeArguments[0] == type);
    }

    public static IEnumerable<Type> InThisProject(Type contract)
    {
        return typeof(ValueObjectContract).Assembly
            .GetExportedTypes()
            .Where(type => Implements(type, contract));
    }
}
