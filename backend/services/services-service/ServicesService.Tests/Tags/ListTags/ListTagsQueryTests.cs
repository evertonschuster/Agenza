using ServicesService.Application.Tags;
using ServicesService.Application.Tags.ListTags;

namespace ServicesService.Tests.Tags.ListTags;

public class ListTagsQueryTests
{
    [Fact]
    public void ToFilter_WithTheDefaultQuery_RequestsTheFirstPageWithoutSearch()
    {
        var query = new ListTagsQuery();
        var expectedFilter = new TagListFilter(1, 20, null);

        var filter = query.ToFilter();

        filter.Should().Be(expectedFilter);
    }

    [Theory]
    [InlineData("  VIP  ", "vip")]
    [InlineData("Promoção", "promoção")]
    [InlineData("50%_off", "50%_off")]
    public void ToFilter_WithSearchAndPaging_CarriesTheNormalizedTextAndPage(string raw, string expected)
    {
        var search = SearchText.Create(raw).Value;
        var query = new ListTagsQuery(search) { Page = 3, PageSize = 50 };
        var expectedFilter = new TagListFilter(3, 50, expected);

        var filter = query.ToFilter();

        filter.Should().Be(expectedFilter);
    }
}
