namespace Admin.SharedKernel.Tests;

public class PageRequestTests
{
    [Fact]
    public void Constructor_WithAValidPage_KeepsThePageAndThePageSize()
    {
        var request = new PageRequest(3, 50);

        request.Page.Should().Be(3);
        request.PageSize.Should().Be(50);
    }

    [Theory]
    [InlineData(1, 20, 0)]
    [InlineData(2, 20, 20)]
    [InlineData(3, 50, 100)]
    [InlineData(1, 1, 0)]
    [InlineData(21_474_837, 100, 2_147_483_600)]
    public void Offset_IsThePageBeforeTimesThePageSize(int page, int pageSize, int expected)
    {
        new PageRequest(page, pageSize).Offset.Should().Be(expected);
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(-1, 20)]
    [InlineData(int.MinValue, 20)]
    public void Constructor_WithAPageBelowTheFirst_Throws(int page, int pageSize)
    {
        var act = () => new PageRequest(page, pageSize);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("page");
    }

    [Theory]
    [InlineData(1, 0)]
    [InlineData(1, -5)]
    public void Constructor_WithAnEmptyPageSize_Throws(int page, int pageSize)
    {
        var act = () => new PageRequest(page, pageSize);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("pageSize");
    }

    [Theory]
    [InlineData(int.MaxValue, 20)]
    [InlineData(21_474_838, 100)]
    [InlineData(43_000_000, 100)]
    public void Constructor_WithAnOffsetThatDoesNotFitAnInt_Throws(int page, int pageSize)
    {
        var act = () => new PageRequest(page, pageSize);

        act.Should().Throw<ArgumentOutOfRangeException>().WithParameterName("page");
    }

    [Theory]
    [InlineData(1, 100, true)]
    [InlineData(21_474_837, 100, true)]
    [InlineData(21_474_838, 100, false)]
    [InlineData(int.MaxValue, 1, true)]
    [InlineData(int.MaxValue, 2, false)]
    [InlineData(0, 100, true)]
    [InlineData(1, 0, true)]
    public void OffsetFits_IsTrueWhileThePageBeforeTimesThePageSizeFitsAnInt(int page, int pageSize, bool expected)
    {
        PageRequest.OffsetFits(page, pageSize).Should().Be(expected);
    }

    [Fact]
    public void TwoRequestsForTheSamePage_AreEqual()
    {
        new PageRequest(2, 20).Should().Be(new PageRequest(2, 20));
        new PageRequest(2, 20).Should().NotBe(new PageRequest(3, 20));
        new PageRequest(2, 20).Should().NotBe(new PageRequest(2, 10));
    }

    [Fact]
    public void TheLimits_AreTheOnesTheListsPromise()
    {
        PageRequest.FirstPage.Should().Be(1);
        PageRequest.DefaultPageSize.Should().Be(20);
        PageRequest.MaxPageSize.Should().Be(100);
    }

    [Fact]
    public void TheErrorCodes_AreTheStableOnesClientsBranchOn()
    {
        PageRequest.PageInvalidCode.Should().Be("Paging.PageInvalid");
        PageRequest.PageSizeInvalidCode.Should().Be("Paging.PageSizeInvalid");
        PageRequest.PageTooLargeCode.Should().Be("Paging.PageTooLarge");
    }
}
