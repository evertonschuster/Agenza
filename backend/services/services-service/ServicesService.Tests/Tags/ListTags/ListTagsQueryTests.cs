using ServicesService.Application.Tags;
using ServicesService.Application.Tags.ListTags;

namespace ServicesService.Tests.Tags.ListTags;

public class ListTagsQueryTests
{
    [Fact]
    public void ToFilter_WithTheDefaultQuery_RequestsTheFirstPageWithoutSearch()
    {
        new ListTagsQuery().ToFilter().Should().Be(new TagListFilter(1, 20, null));
    }

    [Theory]
    [InlineData("  VIP  ", "vip")]
    [InlineData("Promoção", "promoção")]
    [InlineData("50%_off", "50%_off")]
    public void ToFilter_WithSearchAndPaging_CarriesTheNormalizedTextAndPage(string raw, string expected)
    {
        var query = new ListTagsQuery(SearchText.Create(raw).Value) { Page = 3, PageSize = 50 };

        query.ToFilter().Should().Be(new TagListFilter(3, 50, expected));
    }
}
