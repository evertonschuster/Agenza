namespace Admin.SharedKernel.Tests;

public class StringValueObjectContractTests
{
    public static TheoryData<Type> SharedValueObjects()
    {
        var data = new TheoryData<Type>();
        foreach (var type in StringValueObjects.InThisProject())
        {
            data.Add(type);
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(SharedValueObjects))]
    public void Create_WithNullOrBlank_FailsWithAMessage(Type valueObject)
    {
        var create = valueObject.GetMethod(nameof(CpfNumber.Create), [typeof(string)])!;

        foreach (var raw in new string?[] { null, "", "   " })
        {
            var result = create.Invoke(null, [raw])!;

            ((bool)result.GetType().GetProperty(nameof(ParseResult<string>.IsFailure))!.GetValue(result)!).Should().BeTrue();
            ((string)result.GetType().GetProperty(nameof(ParseResult<string>.Error))!.GetValue(result)!).Should().NotBeEmpty();
        }
    }
}
