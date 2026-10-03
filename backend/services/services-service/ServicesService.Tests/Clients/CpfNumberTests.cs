using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class CpfNumberTests
{
    [Theory]
    [InlineData("529.982.247-25", "52998224725")]
    [InlineData("52998224725", "52998224725")]
    [InlineData("  529.982.247-25  ", "52998224725")]
    [InlineData("529 982 247 25", "52998224725")]
    [InlineData("123.456.789-09", "12345678909")]
    [InlineData("111.444.777-35", "11144477735")]
    public void Create_WithValidCpf_StripsTheMask(string raw, string expectedDigits)
    {
        var result = CpfNumber.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Value.Should().Be(expectedDigits);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankValue_ReturnsNull(string? raw)
    {
        var result = CpfNumber.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeNull();
    }

    [Theory]
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
    public void Create_WithInvalidCpf_Fails(string raw)
    {
        var result = CpfNumber.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Client.Invalid");
        CpfNumber.IsValid(raw).Should().BeFalse();
    }

    [Fact]
    public void IsValid_WithValidMaskedCpf_ReturnsTrue()
    {
        CpfNumber.IsValid("529.982.247-25").Should().BeTrue();
    }
}
