using ServicesService.Application.Clients;
using ServicesService.Application.Clients.ListClients;

namespace ServicesService.Tests.Clients.ListClients;

public class ListClientsQueryTests
{
    private static SearchText SearchTextOf(string raw)
    {
        return SearchText.Create(raw).Value;
    }

    private static ClientListFilter FilterOf(string raw)
    {
        return new ListClientsQuery(Search: SearchTextOf(raw)).ToFilter();
    }

    [Theory]
    [InlineData(ClientStatusFilter.Active, ClientStatus.Active)]
    [InlineData(ClientStatusFilter.Inactive, ClientStatus.Inactive)]
    [InlineData(null, ClientStatus.Active)]
    public void ToFilter_MapsTheStatusFilterToTheClientStatus(ClientStatusFilter? status, ClientStatus expected)
    {
        new ListClientsQuery(Status: status).ToFilter().Status.Should().Be(expected);
    }

    [Fact]
    public void ToFilter_WithTheAllFilter_HasNoStatusRestriction()
    {
        new ListClientsQuery(Status: ClientStatusFilter.All).ToFilter().Status.Should().BeNull();
    }

    [Fact]
    public void ToFilter_OfTheDefaultQuery_AsksForTheFirstPageOfTheActiveOnesWithoutSearch()
    {
        var filter = new ListClientsQuery().ToFilter();

        filter.Should().Be(new ClientListFilter(1, 20, null, null, ClientStatus.Active));
    }

    [Fact]
    public void ToFilter_CarriesThePageTheSizeTheSearchAndTheCpfDigitsOfTheQuery()
    {
        var query = new ListClientsQuery(Search: SearchTextOf("  529.982.247-25 "), Status: ClientStatusFilter.Inactive)
        {
            Page = 3,
            PageSize = 50,
        };

        var filter = query.ToFilter();

        filter.Should().Be(new ClientListFilter(3, 50, "529.982.247-25", CpfDigits.Create("52998224725"), ClientStatus.Inactive));
        filter.Page.Should().Be(3);
        filter.PageSize.Should().Be(50);
    }

    [Fact]
    public void ToFilter_WithAPageNoRepositoryCouldServe_Throws()
    {
        var act = () => new ListClientsQuery { Page = 0 }.ToFilter();

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void ToFilter_WithoutSearch_HasNoTextAndNoCpf()
    {
        var filter = new ListClientsQuery().ToFilter();

        filter.Text.Should().BeNull();
        filter.CpfDigits.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ToFilter_WithAnEmptySearchText_IsNoSearch(string raw)
    {
        var filter = FilterOf(raw);

        filter.Text.Should().BeNull();
        filter.CpfDigits.Should().BeNull();
    }

    [Theory]
    [InlineData("  Maria SILVA ", "maria silva")]
    [InlineData("MARIA@Example.COM", "maria@example.com")]
    [InlineData("josé", "josé")]
    [InlineData("50%_off", "50%_off")]
    public void ToFilter_KeepsTheNormalizedTextForTheNameAndTheEmail(string raw, string expected)
    {
        FilterOf(raw).Text.Should().Be(expected);
    }

    [Theory]
    [InlineData("529.982.247-25", "52998224725")]
    [InlineData("456.789", "456789")]
    [InlineData("123", "123")]
    public void ToFilter_WithDigitsAndCpfMask_AlsoCarriesTheCpfDigitsWithoutTheMask(string raw, string expectedDigits)
    {
        var filter = FilterOf(raw);

        filter.CpfDigits.Should().Be(CpfDigits.Create(expectedDigits));
        filter.Text.Should().Be(raw);
    }

    [Theory]
    [InlineData("maria")]
    [InlineData("ana-lima")]
    [InlineData("529982247255")]
    public void ToFilter_WithAnythingThatIsNotACpfFragment_DoesNotCarryTheCpfButKeepsTheText(string raw)
    {
        var filter = FilterOf(raw);

        filter.CpfDigits.Should().BeNull();
        filter.Text.Should().Be(raw);
    }
}
