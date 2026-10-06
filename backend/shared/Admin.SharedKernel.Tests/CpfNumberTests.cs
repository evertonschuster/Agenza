using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel.Tests;

public class CpfNumberTests
{
    [Theory]
    [InlineData("529.982.247-25", "52998224725")]
    [InlineData("52998224725", "52998224725")]
    [InlineData("  529.982.247-25  ", "52998224725")]
    [InlineData("529 982 247 25", "52998224725")]
    [InlineData("123.456.789-09", "12345678909")]
    [InlineData("111.444.777-35", "11144477735")]
    public void TryParse_WithAValidCpf_StripsTheMask(string raw, string expectedDigits)
    {
        CpfNumber.TryParse(raw, null, out var cpf).Should().BeTrue();

        cpf!.Value.Should().Be(expectedDigits);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("529.982.247-24")]
    [InlineData("529.982.247-52")]
    [InlineData("123.456.789-00")]
    [InlineData("5299822472")]
    [InlineData("529982247255")]
    [InlineData("000.000.000-00")]
    [InlineData("111.111.111-11")]
    [InlineData("999.999.999-99")]
    [InlineData("abc.def.ghi-jk")]
    [InlineData("529.982.247-2a")]
    [InlineData("٥٢٩٩٨٢٢٤٧٢٥")]
    public void TryParse_WithAnythingElse_Fails(string? raw)
    {
        CpfNumber.TryParse(raw, null, out var cpf).Should().BeFalse();

        cpf.Should().BeNull();
    }

    [Fact]
    public void Parse_WithAValidCpf_ReturnsIt()
    {
        CpfNumber.Parse("529.982.247-25", null).Value.Should().Be("52998224725");
    }

    [Fact]
    public void Parse_WithAnInvalidCpf_ThrowsAFormatExceptionWithTheTypeMessage()
    {
        var act = () => CpfNumber.Parse("529.982.247-24", null);

        act.Should().Throw<FormatException>().WithMessage(CpfNumber.InvalidMessage);
    }

    [Fact]
    public void Restore_AcceptsACpfThatTryParseWouldReject()
    {
        CpfNumber.Restore("00000000000").Value.Should().Be("00000000000");
    }
}
