using System.Reflection;

namespace ServicesService.Tests;

public class ObjectValueObjectContractTests
{
    public static TheoryData<Type> ServiceObjectValueObjects()
    {
        var data = new TheoryData<Type>();
        foreach (var type in ObjectValueObjects.InAssembly(typeof(Service).Assembly))
        {
            data.Add(type);
        }

        return data;
    }

    [Fact]
    public void TheServiceDomain_DeclaresAtLeastOneObjectValueObject()
    {
        ObjectValueObjects.InAssembly(typeof(Service).Assembly).Should().NotBeEmpty();
    }

    [Theory]
    [MemberData(nameof(ServiceObjectValueObjects))]
    public void Create_IsASinglePublicStaticMethodReturningAParseResult(Type valueObject)
    {
        var act = () => ObjectValueObjects.CreateOf(valueObject);

        act.Should().NotThrow();
    }

    [Theory]
    [MemberData(nameof(ServiceObjectValueObjects))]
    public void EveryCreateParameter_IsExposedByTheValueObjectUnderTheSameName(Type valueObject)
    {
        var exposed = valueObject.GetProperties(BindingFlags.Public | BindingFlags.Instance).Select(property => property.Name);

        ObjectValueObjects.PartsOf(valueObject).Select(part => part.Name)
            .Should().OnlyContain(name => exposed.Contains(name, StringComparer.OrdinalIgnoreCase));
    }

    [Theory]
    [MemberData(nameof(ServiceObjectValueObjects))]
    public void Create_WithoutAnyPart_FailsWithAMessage_WhenSomePartIsRequired(Type valueObject)
    {
        var create = ObjectValueObjects.CreateOf(valueObject);
        var noParts = new object?[create.GetParameters().Length];

        var result = create.Invoke(null, noParts)!;

        var isFailure = (bool)result.GetType().GetProperty("IsFailure")!.GetValue(result)!;
        isFailure.Should().Be(ObjectValueObjects.PartsOf(valueObject).Any(part => part.Required));
        if (isFailure)
        {
            ((string)result.GetType().GetProperty("Error")!.GetValue(result)!).Should().NotBeEmpty();
        }
    }
}
