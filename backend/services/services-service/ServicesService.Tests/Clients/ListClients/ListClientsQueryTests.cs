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
    public void ToFilter_MapsTheStatusFilterToTheClientStatus(ClientStatusFilter status, ClientStatus expected)
    {
        new ListClientsQuery(Status: status).ToFilter().Status.Should().Be(expected);
    }

    [Theory]
    [InlineData(ClientStatusFilter.All)]
    [InlineData(null)]
    public void ToFilter_WithTheAllFilterOrNoStatus_HasNoStatusRestriction(ClientStatusFilter? status)
    {
        new ListClientsQuery(Status: status).ToFilter().Status.Should().BeNull();
    }

    [Fact]
    public void ToFilter_OfTheDefaultQuery_AsksForTheFirstPageOfEveryoneWithoutSearch()
    {
        var filter = new ListClientsQuery().ToFilter();

        filter.Should().Be(new ClientListFilter(1, 20, null, null, null));
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

        filter.Should().Be(new ClientListFilter(3, 50, "529.982.247-25", "52998224725", ClientStatus.Inactive));
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
    [InlineData("52998224725", "52998224725")]
    [InlineData(" 529 982 247 25 ", "52998224725")]
    [InlineData("529.982.247-24", "52998224724")]
    [InlineData("12345678901", "12345678901")]
    [InlineData("456.789", "456789")]
    [InlineData("1.2-3", "123")]
    [InlineData("123", "123")]
    [InlineData("0", "0")]
    public void ToFilter_WithDigitsAndCpfMask_AlsoCarriesTheCpfDigitsWithoutTheMask(string raw, string expectedDigits)
    {
        FilterOf(raw).CpfDigits.Should().Be(expectedDigits);
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
    [InlineData(". - .")]
    [InlineData("529982247255")]
    [InlineData("529.982.247-255")]
    [InlineData("١٢٣")]
    [InlineData("１２３")]
    public void ToFilter_WithAnythingThatIsNotACpfFragment_DoesNotCarryTheCpfButKeepsTheText(string raw)
    {
        var filter = FilterOf(raw);

        filter.CpfDigits.Should().BeNull();
        filter.Text.Should().Be(raw);
    }
}
