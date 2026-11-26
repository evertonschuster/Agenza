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
    public void EveryPartOfTheInput_IsExposedByTheValueObjectUnderTheSameName(Type valueObject)
    {
        var exposed = valueObject.GetProperties(BindingFlags.Public | BindingFlags.Instance).Select(property => property.Name);

        ObjectValueObjects.PartsOf(valueObject).Select(part => part.Name).Should().BeSubsetOf(exposed);
    }

    [Theory]
    [MemberData(nameof(ServiceObjectValueObjects))]
    public void Create_WithoutAnyPart_FailsWithAMessage_WhenSomePartIsRequired(Type valueObject)
    {
        var input = ObjectValueObjects.InputOf(valueObject);
        var parameterCount = input.GetConstructors().Max(constructor => constructor.GetParameters().Length);
        var empty = Activator.CreateInstance(input, Enumerable.Repeat<object?>(null, parameterCount).ToArray())!;

        var result = valueObject.GetMethod("Create", [input])!.Invoke(null, [empty])!;

        var parts = ObjectValueObjects.PartsOf(valueObject);
        var isFailure = (bool)result.GetType().GetProperty("IsFailure")!.GetValue(result)!;
        isFailure.Should().Be(parts.Any(part => part.Required));
        if (isFailure)
        {
            ((string)result.GetType().GetProperty("Error")!.GetValue(result)!).Should().NotBeEmpty();
        }
    }
}
