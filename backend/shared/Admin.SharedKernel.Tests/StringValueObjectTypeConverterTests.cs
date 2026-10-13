using System.ComponentModel;
using System.Globalization;

namespace Admin.SharedKernel.Tests;

public class StringValueObjectTypeConverterTests
{
    private static readonly TypeConverter Search = TypeDescriptor.GetConverter(typeof(SearchText));

    [Fact]
    public void CanConvertFrom_AcceptsAString()
    {
        Search.CanConvertFrom(typeof(string)).Should().BeTrue();
    }

    [Theory]
    [InlineData(typeof(int))]
    [InlineData(typeof(Guid))]
    [InlineData(typeof(DateOnly))]
    public void CanConvertFrom_RefusesAnythingElse(Type source)
    {
        Search.CanConvertFrom(source).Should().BeFalse();
    }

    [Fact]
    public void ConvertFrom_BuildsTheNormalizedValueObject()
    {
        var converted = Search.ConvertFrom(null, CultureInfo.InvariantCulture, "  Maria SILVA ");

        converted.Should().BeOfType<SearchText>().Which.Value.Should().Be("maria silva");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ConvertFrom_ABlankValue_IsNullWhenBlankIsAbsent(string blank)
    {
        Search.ConvertFrom(null, CultureInfo.InvariantCulture, blank).Should().BeNull();
    }

    [Fact]
    public void ConvertFrom_ABlankValue_FailsWhenTheTypeRequiresOne()
    {
        var convert = () => TypeDescriptor.GetConverter(typeof(RequiredName)).ConvertFrom(null, CultureInfo.InvariantCulture, "  ");

        convert.Should().Throw<FormatException>().WithMessage("O nome é obrigatório.");
    }

    [Fact]
    public void ConvertFrom_AnInvalidValue_ThrowsAFormatExceptionWithTheMessageOfTheValueObject()
    {
        var convert = () => TypeDescriptor.GetConverter(typeof(SearchText)).ConvertFrom(null, CultureInfo.InvariantCulture, new string('a', SearchText.MaxLength + 1));

        convert.Should().Throw<FormatException>().WithMessage("A busca deve ter no máximo 254 caracteres.");
    }

    [Fact]
    public void ConvertFrom_ANonStringSource_IsNotSupported()
    {
        var convert = () => Search.ConvertFrom(null, CultureInfo.InvariantCulture, 42);

        convert.Should().Throw<NotSupportedException>();
    }
}
