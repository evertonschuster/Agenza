using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel.Tests;

public class PhoneNumberTests
{
    private const string InvalidMessage =
        "Informe um telefone válido, com até 20 caracteres entre dígitos, espaços, +, parênteses e hífen.";

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
        result.Value.Value.Should().Be(raw);
    }

    [Fact]
    public void Create_TrimsSurroundingWhitespace()
    {
        PhoneNumber.Create("  (11) 99999-0000  ").Value.Value.Should().Be("(11) 99999-0000");
    }

    [Fact]
    public void Create_WithExactlyTwentyCharacters_Succeeds()
    {
        PhoneNumber.Create(new string('1', PhoneNumber.MaxLength)).IsSuccess.Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("123456789012345678901")]
    [InlineData("(11) 99999-0000 ramal 12")]
    [InlineData("11.99999.0000")]
    [InlineData("11/99999")]
    [InlineData("telefone")]
    [InlineData("+-() ")]
    [InlineData("---")]
    public void Create_WithBlankOrDisallowedShape_FailsWithTheValidatorMessage(string? raw)
    {
        var result = PhoneNumber.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(InvalidMessage);
    }

    [Fact]
    public void BlankIsAbsent_IsTrue_BecauseThePhoneIsOptional()
    {
        BlankIsAbsentOf<PhoneNumber>().Should().BeTrue();
    }

    private static bool BlankIsAbsentOf<T>()
        where T : class, IStringValueObject<T> => T.BlankIsAbsent;

    [Fact]
    public void Restore_AcceptsAPhoneThatCreateWouldReject()
    {
        PhoneNumber.Restore("ramal 21").Value.Should().Be("ramal 21");
    }
}
