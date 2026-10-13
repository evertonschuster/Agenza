using ServicesService.Application.Services;
using ServicesService.Application.Services.ListServices;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryTests
{
    private static SearchText SearchTextOf(string raw)
    {
        return SearchText.Create(raw).Value;
    }

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
        var query = new ListServicesQuery(Search: SearchTextOf("  Cut "), CategoryId: categoryId, TagId: tagId)
        {
            Page = 2,
            PageSize = 5,
        };

        query.ToFilter().Should().Be(new ServiceListFilter(2, 5, "cut", categoryId, tagId));
    }

    [Theory]
    [InlineData("  Hair CUT ", "hair cut")]
    [InlineData("100%", "100%")]
    [InlineData("a_b", "a_b")]
    public void ToFilter_KeepsTheNormalizedTextOfTheSearch(string raw, string expected)
    {
        new ListServicesQuery(Search: SearchTextOf(raw)).ToFilter().Text.Should().Be(expected);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ToFilter_WithAnEmptySearchText_IsNoSearch(string raw)
    {
        new ListServicesQuery(Search: SearchTextOf(raw)).ToFilter().Text.Should().BeNull();
    }

    [Fact]
    public void ToFilter_WithAPageNoRepositoryCouldServe_Throws()
    {
        var act = () => new ListServicesQuery { PageSize = 0 }.ToFilter();

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
