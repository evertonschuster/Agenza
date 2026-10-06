namespace Admin.SharedKernel.ValueObjects;

public static class DateValueObjects
{
    public static bool Is(Type type) => ValueObjectContract.Implements(type, typeof(IDateValueObject<>));

    public static IEnumerable<Type> InThisProject() => ValueObjectContract.InThisProject(typeof(IDateValueObject<>));
}
