using ServicesService.Application.Clients;
using ServicesService.Application.Clients.ListClients;

namespace ServicesService.Tests.Clients.ListClients;

public class ListClientsQueryExtensionsTests
{
    private static SearchText SearchTextOf(string raw)
    {
        return SearchText.Create(raw).Value;
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

        filter.Should().Be(ClientListFilter.Create(1, 20, null, ClientStatus.Active));
    }

    [Fact]
    public void ToFilter_CarriesThePageTheSizeAndTheSearchOfTheQuery()
    {
        var query = new ListClientsQuery(Search: SearchTextOf("  Maria SILVA "), Status: ClientStatusFilter.Inactive)
        {
            Page = 3,
            PageSize = 50,
        };

        var filter = query.ToFilter();

        filter.Should().Be(ClientListFilter.Create(3, 50, SearchTextOf("maria silva"), ClientStatus.Inactive));
        filter.Page.Should().Be(3);
        filter.PageSize.Should().Be(50);
        filter.Text.Should().Be("maria silva");
    }

    [Fact]
    public void ToFilter_WithAPageNoRepositoryCouldServe_Throws()
    {
        var act = () => new ListClientsQuery { Page = 0 }.ToFilter();

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
