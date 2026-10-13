using ServicesService.Application.Services;
using ServicesService.Application.Services.ListServices;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryExtensionsTests
{
    [Fact]
    public void ToFilter_OfTheDefaultQuery_AsksForTheFirstPageWithNoFilter()
    {
        new ListServicesQuery().ToFilter().Should().Be(ServiceListFilter.Create(1, 20, null, null, null));
    }

    [Fact]
    public void ToFilter_CarriesThePageTheSizeAndEveryFilterOfTheQuery()
    {
        var categoryId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var query = new ListServicesQuery(Search: "  cut ", CategoryId: categoryId, TagId: tagId) { Page = 2, PageSize = 5 };

        var filter = query.ToFilter();

        filter.Should().Be(ServiceListFilter.Create(2, 5, "cut", categoryId, tagId));
        filter.Search.Should().Be("cut");
    }

    [Fact]
    public void ToFilter_WithAPageNoRepositoryCouldServe_Throws()
    {
        var act = () => new ListServicesQuery { PageSize = 0 }.ToFilter();

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
