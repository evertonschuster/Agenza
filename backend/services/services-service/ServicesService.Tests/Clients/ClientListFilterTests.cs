using Admin.SharedKernel;
using ServicesService.Application.Clients;

namespace ServicesService.Tests.Clients;

public class ClientListFilterTests
{
    private static SearchText SearchTextOf(string raw)
    {
        return SearchText.Create(raw).Value;
    }

    [Fact]
    public void Create_KeepsThePageAndExposesItsOffset()
    {
        var filter = ClientListFilter.Create(3, 50, null, null);

        filter.Page.Should().Be(3);
        filter.PageSize.Should().Be(50);
        filter.Offset.Should().Be(100);
        filter.Should().BeAssignableTo<PageRequest>();
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(1, 0)]
    [InlineData(21_474_838, 100)]
    public void Create_WithAPageNoRepositoryCouldServe_Throws(int page, int pageSize)
    {
        var act = () => ClientListFilter.Create(page, pageSize, null, null);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_WithoutSearch_HasNoTextAndNoCpf()
    {
        var filter = ClientListFilter.Create(1, 20, null, null);

        filter.Text.Should().BeNull();
        filter.CpfDigits.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithAnEmptySearchText_IsNoSearch(string raw)
    {
        var filter = ClientListFilter.Create(1, 20, SearchTextOf(raw), null);

        filter.Text.Should().BeNull();
        filter.CpfDigits.Should().BeNull();
    }

    [Theory]
    [InlineData("  Maria SILVA ", "maria silva")]
    [InlineData("MARIA@Example.COM", "maria@example.com")]
    [InlineData("josé", "josé")]
    [InlineData("50%_off", "50%_off")]
    public void Create_KeepsTheNormalizedTextForTheNameAndTheEmail(string raw, string expected)
    {
        ClientListFilter.Create(1, 20, SearchTextOf(raw), null).Text.Should().Be(expected);
    }

    [Theory]
    [InlineData("529.982.247-25", "52998224725")]
    [InlineData("52998224725", "52998224725")]
    [InlineData(" 529 982 247 25 ", "52998224725")]
    [InlineData("123", "123")]
    [InlineData("456.789", "456789")]
    [InlineData("0", "0")]
    public void Create_WithDigitsAndCpfMask_AlsoCarriesTheCpfWithoutTheMask(string raw, string expectedDigits)
    {
        var filter = ClientListFilter.Create(1, 20, SearchTextOf(raw), null);

        filter.CpfDigits.Should().Be(expectedDigits);
        filter.Text.Should().Be(raw.Trim());
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
    [InlineData(".")]
    [InlineData("-")]
    [InlineData("...---")]
    public void Create_WithAnythingButDigitsAndTheMask_DoesNotCarryTheCpf(string raw)
    {
        var filter = ClientListFilter.Create(1, 20, SearchTextOf(raw), null);

        filter.CpfDigits.Should().BeNull();
        filter.Text.Should().Be(raw);
    }

    [Fact]
    public void Create_OnlyAcceptsAsciiDigitsForTheCpf()
    {
        ClientListFilter.Create(1, 20, SearchTextOf("١٢٣"), null).CpfDigits.Should().BeNull();
        ClientListFilter.Create(1, 20, SearchTextOf("１２３"), null).CpfDigits.Should().BeNull();
    }

    [Theory]
    [InlineData(null)]
    [InlineData(ClientStatus.Active)]
    [InlineData(ClientStatus.Inactive)]
    public void Create_KeepsTheStatusItWasGiven(ClientStatus? status)
    {
        ClientListFilter.Create(1, 20, null, status).Status.Should().Be(status);
    }

    [Fact]
    public void TwoFiltersWithTheSameValues_AreEqual()
    {
        var filter = ClientListFilter.Create(2, 20, SearchTextOf("Maria"), ClientStatus.Active);

        filter.Should().Be(ClientListFilter.Create(2, 20, SearchTextOf(" MARIA "), ClientStatus.Active));
        filter.Should().NotBe(ClientListFilter.Create(3, 20, SearchTextOf("Maria"), ClientStatus.Active));
        filter.Should().NotBe(ClientListFilter.Create(2, 20, SearchTextOf("Maria"), ClientStatus.Inactive));
        filter.Should().NotBe(ClientListFilter.Create(2, 20, SearchTextOf("Mario"), ClientStatus.Active));
    }
}
