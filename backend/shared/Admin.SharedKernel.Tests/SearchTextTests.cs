namespace Admin.SharedKernel.Tests;

public class SearchTextTests
{
    [Theory]
    [InlineData("maria", "maria")]
    [InlineData("  Maria SILVA ", "maria silva")]
    [InlineData("MARIA@Example.COM", "maria@example.com")]
    [InlineData("529.982.247-25", "529.982.247-25")]
    [InlineData("José", "josé")]
    [InlineData("50%_off", "50%_off")]
    public void Create_TrimsAndLowercasesTheText(string raw, string expected)
    {
        var result = SearchText.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value.Value.Should().Be(expected);
    }

    [Fact]
    public void Create_KeepsTheInnerSpacingAndTheAccents()
    {
        SearchText.Create("  Ana   Lúcia ").Value.Value.Should().Be("ana   lúcia");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\t\n")]
    public void Create_WithNoText_FailsWithAMessage(string? raw)
    {
        var result = SearchText.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be("Informe um texto para a busca.");
    }

    [Fact]
    public void Create_AcceptsTheLongestText()
    {
        SearchText.Create(new string('a', SearchText.MaxLength)).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_RefusesATextPastTheLimit()
    {
        var result = SearchText.Create(new string('a', SearchText.MaxLength + 1));

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be("A busca deve ter no máximo 254 caracteres.");
    }

    [Fact]
    public void Create_MeasuresTheTextAfterTheTrim()
    {
        var padded = $"  {new string('a', SearchText.MaxLength)}  ";

        SearchText.Create(padded).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_NeverEchoesTheValueInTheError()
    {
        SearchText.Create(new string('z', SearchText.MaxLength + 1)).Error.Should().NotContain("zzz");
    }

    [Fact]
    public void Restore_DoesNotValidateNorNormalize()
    {
        SearchText.Restore("  KEEP ME  ").Value.Should().Be("  KEEP ME  ");
    }

    [Fact]
    public void BlankIsAbsent_IsTheDefault()
    {
        BlankIsAbsent<SearchText>().Should().BeTrue();
    }

    [Fact]
    public void TwoTextsThatNormalizeAlike_AreEqual()
    {
        SearchText.Create(" MARIA ").Value.Should().Be(SearchText.Create("maria").Value);
    }

    private static bool BlankIsAbsent<T>()
        where T : class, IStringValueObject<T>
    {
        return T.BlankIsAbsent;
    }
}
