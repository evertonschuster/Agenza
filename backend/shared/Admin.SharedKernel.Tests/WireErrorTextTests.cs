namespace Admin.SharedKernel.Tests;

public class WireErrorTextTests
{
    [Fact]
    public void Encode_JoinsTheCodeAndTheMessage()
    {
        WireErrorText.Encode("CpfNumber.Invalid", "O CPF informado é inválido.")
            .Should().Be("CpfNumber.Invalid|O CPF informado é inválido.");
    }

    [Fact]
    public void TryDecode_ReadsWhatEncodeWrote()
    {
        var text = WireErrorText.Encode("CpfNumber.Invalid", "O CPF informado é inválido.");

        WireErrorText.TryDecode(text, out var fieldError).Should().BeTrue();

        fieldError.Should().Be(new FieldError("CpfNumber.Invalid", "O CPF informado é inválido."));
    }

    [Fact]
    public void TryDecode_KeepsEverythingAfterTheFirstSeparatorAsTheMessage()
    {
        WireErrorText.TryDecode("Thing.Invalid|a | b", out var fieldError).Should().BeTrue();

        fieldError.Message.Should().Be("a | b");
    }

    [Theory]
    [InlineData("")]
    [InlineData("|sem codigo")]
    [InlineData("sem separador")]
    [InlineData("cpf.Invalid|minuscula")]
    [InlineData("SemPonto|sem ponto")]
    [InlineData("Thing.|termina em ponto")]
    [InlineData("Thing..Invalid|dois pontos")]
    [InlineData("Thing Invalid.X|com espaco")]
    [InlineData("Expected depth to be zero. Path: $.fullName | LineNumber: 0 | BytePositionInLine: 12.")]
    [InlineData("The JSON value could not be converted to X. Path: $.birthDate | LineNumber: 0 | BytePositionInLine: 3.")]
    public void TryDecode_RejectsTextThatIsNotACodeAndAMessage(string text)
    {
        WireErrorText.TryDecode(text, out var fieldError).Should().BeFalse();

        fieldError.Should().Be(default(FieldError));
    }
}
