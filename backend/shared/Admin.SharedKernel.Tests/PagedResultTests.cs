namespace Admin.SharedKernel.Tests;

public class PagedResultTests
{
    [Fact]
    public void Map_ConvertsEveryItemKeepingTheirOrder()
    {
        var page = new PagedResult<int>([3, 1, 2], 10, 2, 3);

        var mapped = page.Map(number => $"#{number}");

        mapped.Items.Should().Equal("#3", "#1", "#2");
    }

    [Fact]
    public void Map_KeepsTheTotalThePageAndThePageSize()
    {
        var page = new PagedResult<int>([1], 41, 5, 8);

        var mapped = page.Map(number => number * 2);

        mapped.TotalCount.Should().Be(41);
        mapped.Page.Should().Be(5);
        mapped.PageSize.Should().Be(8);
    }

    [Fact]
    public void Map_OfAnEmptyPage_IsAnEmptyPageWithTheSameTotal()
    {
        var page = new PagedResult<int>([], 7, 9, 20);

        var mapped = page.Map(number => number.ToString());

        mapped.Items.Should().BeEmpty();
        mapped.TotalCount.Should().Be(7);
        mapped.Page.Should().Be(9);
    }

    [Fact]
    public void Map_LeavesTheSourcePageUntouched()
    {
        var page = new PagedResult<int>([1, 2], 2, 1, 20);

        _ = page.Map(number => number + 1);

        page.Items.Should().Equal(1, 2);
    }

    [Fact]
    public void Map_CallsTheConversionOncePerItem()
    {
        var calls = 0;
        var page = new PagedResult<int>([1, 2, 3], 3, 1, 20);

        var mapped = page.Map(number =>
        {
            calls++;
            return number;
        });

        calls.Should().Be(3);
        mapped.Items.Should().HaveCount(3);
    }
}
