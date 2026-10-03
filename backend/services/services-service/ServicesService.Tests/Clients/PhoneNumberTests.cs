using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class PhoneNumberTests
{
    [Theory]
    [InlineData("11999990000")]
    [InlineData("(11) 99999-0000")]
    [InlineData("+55 (11) 99999-0000")]
    [InlineData("11 9999-0000")]
    [InlineData("+55 11 99999 0000")]
    public void Create_WithAllowedCharacters_KeepsTheValue(string raw)
    {
        var result = PhoneNumber.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Value.Should().Be(raw);
    }

    [Fact]
    public void Create_TrimsSurroundingWhitespace()
    {
        PhoneNumber.Create("  (11) 99999-0000  ").Value!.Value.Should().Be("(11) 99999-0000");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankValue_ReturnsNull(string? raw)
    {
        var result = PhoneNumber.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeNull();
    }

    [Fact]
    public void Create_WithExactlyTwentyCharacters_Succeeds()
    {
        PhoneNumber.Create(new string('1', PhoneNumber.MaxLength)).IsSuccess.Should().BeTrue();
    }

    [Theory]
    [InlineData("123456789012345678901")]
    [InlineData("(11) 99999-0000 ramal 12")]
    [InlineData("11.99999.0000")]
    [InlineData("11/99999")]
    [InlineData("telefone")]
    [InlineData("+-() ")]
    [InlineData("---")]
    public void Create_WithDisallowedShape_Fails(string raw)
    {
        var result = PhoneNumber.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("PhoneNumber.Invalid");
    }
}
