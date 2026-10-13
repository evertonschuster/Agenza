using ServicesService.Application.Clients;

namespace ServicesService.Tests.Clients;

public class CpfDigitsTests
{
    [Theory]
    [InlineData("529.982.247-25", "52998224725")]
    [InlineData("52998224725", "52998224725")]
    [InlineData(" 529 982 247 25 ", "52998224725")]
    [InlineData("123", "123")]
    [InlineData("456.789", "456789")]
    [InlineData("0", "0")]
    [InlineData("1.2-3", "123")]
    public void Create_WithDigitsAndCpfMask_KeepsTheDigitsWithoutTheMask(string raw, string expected)
    {
        CpfDigits.Create(raw)!.Value.Should().Be(expected);
    }

    [Fact]
    public void Create_AcceptsAsManyDigitsAsACpfHas()
    {
        CpfDigits.Create("12345678901")!.Value.Should().HaveLength(CpfNumber.Length);
    }

    [Fact]
    public void Create_WithMoreDigitsThanACpfHas_IsNotACpfFragment()
    {
        CpfDigits.Create("123456789012").Should().BeNull();
        CpfDigits.Create("529.982.247-255").Should().BeNull();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(".")]
    [InlineData("-")]
    [InlineData("...---")]
    [InlineData(". - .")]
    public void Create_WithNothingButMaskOrBlank_IsNotACpfFragment(string? raw)
    {
        CpfDigits.Create(raw).Should().BeNull();
    }

    [Theory]
    [InlineData("maria")]
    [InlineData("maria.silva@example.com")]
    [InlineData("ana-lima")]
    [InlineData("a1")]
    [InlineData("1a")]
    [InlineData("529.982.247-2x")]
    [InlineData("12/34")]
    [InlineData("12,5")]
    public void Create_WithAnythingButDigitsAndTheMask_IsNotACpfFragment(string raw)
    {
        CpfDigits.Create(raw).Should().BeNull();
    }

    [Fact]
    public void Create_OnlyAcceptsAsciiDigits()
    {
        CpfDigits.Create("١٢٣").Should().BeNull();
        CpfDigits.Create("１２３").Should().BeNull();
    }

    [Fact]
    public void ACompleteValidCpf_IsAlsoAFragment_AndAnInvalidOneToo()
    {
        CpfDigits.Create("529.982.247-25").Should().NotBeNull();
        CpfDigits.Create("529.982.247-24").Should().NotBeNull();
        CpfNumber.Create("529.982.247-24").IsSuccess.Should().BeFalse();
    }

    [Fact]
    public void TwoValuesWithTheSameDigits_AreEqualWhateverTheirMask()
    {
        CpfDigits.Create("529.982").Should().Be(CpfDigits.Create("529982"));
        CpfDigits.Create("529.982").Should().NotBe(CpfDigits.Create("529983"));
    }
}
