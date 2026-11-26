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

    public static IEnumerable<Type> InThisProject() => ValueObjectContract.InThisProject(typeof(IObjectValueObject<,>));
}
