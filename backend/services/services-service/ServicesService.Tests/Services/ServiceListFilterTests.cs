using Admin.SharedKernel;
using ServicesService.Application.Services;

namespace ServicesService.Tests.Services;

public class ServiceListFilterTests
{
    [Fact]
    public void ThePageIsKeptAndItsOffsetIsExposed()
    {
        var filter = new ServiceListFilter(3, 50, null, null, null);

        filter.Page.Should().Be(3);
        filter.PageSize.Should().Be(50);
        filter.Offset.Should().Be(100);
        filter.Should().BeAssignableTo<PageRequest>();
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(1, 0)]
    [InlineData(21_474_838, 100)]
    public void APageNoRepositoryCouldServe_Throws(int page, int pageSize)
    {
        var act = () => new ServiceListFilter(page, pageSize, null, null, null);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void TheSearchTheCategoryAndTheTag_AreKeptExactlyAsGiven()
    {
        var categoryId = Guid.NewGuid();
        var tagId = Guid.NewGuid();

        var filter = new ServiceListFilter(1, 20, "  Cut ", categoryId, tagId);

        filter.Search.Should().Be("  Cut ");
        filter.CategoryId.Should().Be(categoryId);
        filter.TagId.Should().Be(tagId);
    }

    [Fact]
    public void TwoFiltersWithTheSameValues_AreEqual()
    {
        var categoryId = Guid.NewGuid();
        var filter = new ServiceListFilter(2, 20, "cut", categoryId, null);

        filter.Should().Be(new ServiceListFilter(2, 20, "cut", categoryId, null));
        filter.Should().NotBe(new ServiceListFilter(3, 20, "cut", categoryId, null));
        filter.Should().NotBe(new ServiceListFilter(2, 20, "cuts", categoryId, null));
        filter.Should().NotBe(new ServiceListFilter(2, 20, "cut", null, null));
    }
}
