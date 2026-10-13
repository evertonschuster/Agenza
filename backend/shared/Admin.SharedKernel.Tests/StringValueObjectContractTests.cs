using Microsoft.AspNetCore.Mvc.ModelBinding;
using System.ComponentModel;

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

    [Fact]
    public void SearchText_DeclaresTheConverter_SoTheFrameworkReadsItAsOneValueNamedQ()
    {
        TypeDescriptor.GetConverter(typeof(SearchText)).CanConvertFrom(typeof(string)).Should().BeTrue();

        var metadata = new EmptyModelMetadataProvider().GetMetadataForType(typeof(SearchText));

        metadata.IsComplexType.Should().BeFalse();
    }

    [Theory]
    [InlineData(typeof(CpfNumber))]
    [InlineData(typeof(EmailAddress))]
    [InlineData(typeof(FullName))]
    [InlineData(typeof(PhoneNumber))]
    [InlineData(typeof(AdministrativeNotes))]
    public void PersonalData_DoesNotDeclareTheConverter_SoItNeverTravelsInAUrl(Type valueObject)
    {
        TypeDescriptor.GetConverter(valueObject).CanConvertFrom(typeof(string)).Should().BeFalse();
    }
}
