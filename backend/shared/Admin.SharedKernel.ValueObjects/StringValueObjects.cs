namespace Admin.SharedKernel.ValueObjects;

public static class StringValueObjects
{
    public static bool Is(Type type) => ValueObjectContract.Implements(type, typeof(IStringValueObject<>));

    public static IEnumerable<Type> InThisProject() => ValueObjectContract.InThisProject(typeof(IStringValueObject<>));
}
