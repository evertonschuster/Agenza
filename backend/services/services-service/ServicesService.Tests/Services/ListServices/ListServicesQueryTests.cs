using ServicesService.Application.Services;
using ServicesService.Application.Services.ListServices;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryTests
{
    [Fact]
    public void ToFilter_OfTheDefaultQuery_AsksForTheFirstPageWithNoFilter()
    {
        new ListServicesQuery().ToFilter().Should().Be(new ServiceListFilter(1, 20, null, null, null));
    }

    [Fact]
    public void ToFilter_CarriesThePageTheSizeAndEveryFilterOfTheQuery()
    {
        var categoryId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var query = new ListServicesQuery(Search: "  cut ", CategoryId: categoryId, TagId: tagId) { Page = 2, PageSize = 5 };

        var filter = query.ToFilter();

        filter.Should().Be(new ServiceListFilter(2, 5, "cut", categoryId, tagId));
        filter.Search.Should().Be("cut");
    }

    [Theory]
    [InlineData("  cut ", "cut")]
    [InlineData("Hair Cut", "Hair Cut")]
    [InlineData("100%", "100%")]
    public void ToFilter_TrimsTheSearchAndKeepsItsCase(string raw, string expected)
    {
        new ListServicesQuery(Search: raw).ToFilter().Search.Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ToFilter_WithABlankSearch_IsNoSearch(string? raw)
    {
        new ListServicesQuery(Search: raw).ToFilter().Search.Should().BeNull();
    }

    [Fact]
    public void ToFilter_WithAPageNoRepositoryCouldServe_Throws()
    {
        var act = () => new ListServicesQuery { PageSize = 0 }.ToFilter();

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
