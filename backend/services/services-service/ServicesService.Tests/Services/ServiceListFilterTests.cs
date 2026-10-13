using Admin.SharedKernel;
using ServicesService.Application.Services;

namespace ServicesService.Tests.Services;

public class ServiceListFilterTests
{
    [Fact]
    public void Create_KeepsThePageAndExposesItsOffset()
    {
        var filter = ServiceListFilter.Create(3, 50, null, null, null);

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
        var act = () => ServiceListFilter.Create(page, pageSize, null, null, null);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData("  cut ", "cut")]
    [InlineData("Hair Cut", "Hair Cut")]
    [InlineData("100%", "100%")]
    public void Create_TrimsTheSearchAndKeepsItsCase(string raw, string expected)
    {
        ServiceListFilter.Create(1, 20, raw, null, null).Search.Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithABlankSearch_IsNoSearch(string? raw)
    {
        ServiceListFilter.Create(1, 20, raw, null, null).Search.Should().BeNull();
    }

    [Fact]
    public void Create_KeepsTheCategoryAndTheTag()
    {
        var categoryId = Guid.NewGuid();
        var tagId = Guid.NewGuid();

        var filter = ServiceListFilter.Create(1, 20, null, categoryId, tagId);

        filter.CategoryId.Should().Be(categoryId);
        filter.TagId.Should().Be(tagId);
    }

    [Fact]
    public void TwoFiltersWithTheSameValues_AreEqual()
    {
        var categoryId = Guid.NewGuid();
        var filter = ServiceListFilter.Create(2, 20, "cut", categoryId, null);

        filter.Should().Be(ServiceListFilter.Create(2, 20, " cut ", categoryId, null));
        filter.Should().NotBe(ServiceListFilter.Create(3, 20, "cut", categoryId, null));
        filter.Should().NotBe(ServiceListFilter.Create(2, 20, "cuts", categoryId, null));
        filter.Should().NotBe(ServiceListFilter.Create(2, 20, "cut", null, null));
    }
}
