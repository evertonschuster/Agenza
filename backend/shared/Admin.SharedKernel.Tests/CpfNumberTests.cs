using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel.Tests;

public class CpfNumberTests
{
    private const string InvalidMessage = "O CPF informado é inválido.";

    [Theory]
    [InlineData("529.982.247-25", "52998224725")]
    [InlineData("52998224725", "52998224725")]
    [InlineData("  529.982.247-25  ", "52998224725")]
    [InlineData("529 982 247 25", "52998224725")]
    [InlineData("123.456.789-09", "12345678909")]
    [InlineData("111.444.777-35", "11144477735")]
    public void Create_WithAValidCpf_StripsTheMask(string raw, string expectedDigits)
    {
        var result = CpfNumber.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value.Value.Should().Be(expectedDigits);
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
    public void Create_WithAnythingElse_FailsWithTheCpfMessage(string? raw)
    {
        var result = CpfNumber.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(InvalidMessage);
    }

    [Fact]
    public void Create_WhenItFails_NeverCarriesTheValue()
    {
        var result = CpfNumber.Create("529.982.247-24");

        result.Error.Should().NotContain("529").And.NotContain("24");
    }

    [Fact]
    public void Restore_AcceptsACpfThatCreateWouldReject()
    {
        CpfNumber.Restore("00000000000").Value.Should().Be("00000000000");
    }
}
