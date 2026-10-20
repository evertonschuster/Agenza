using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.ListTags;

namespace ServicesService.Tests.Tags.ListTags;

public class ListTagsQueryHandlerTests
{
    private readonly ITagRepository _repository = Substitute.For<ITagRepository>();
    private readonly ListTagsQueryHandler _handler;

    public ListTagsQueryHandlerTests()
    {
        _handler = new ListTagsQueryHandler(_repository);
        Returns([], 0);
    }

    private void Returns(IReadOnlyList<Tag> tags, int totalCount)
    {
        _repository.ListAsync(Arg.Any<TagListFilter>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var filter = callInfo.Arg<TagListFilter>();
                return new PagedResult<Tag>(tags, totalCount, filter.Page, filter.PageSize);
            });
    }

    private static Tag NewTag(string name, string? description = null)
    {
        var tagId = Guid.NewGuid();
        var color = TagColor.Create("#0d9488").Value;
        var tagResult = Tag.Create(tagId, name, color, description);

        return tagResult.Value;
    }

    [Fact]
    public async Task Handle_ReturnsEveryTagFieldInTheRepositoryOrder()
    {
        var first = NewTag("Promoção", "Campanha de outubro");
        var second = NewTag("VIP");
        Returns([first, second], 2);

        var result = await _handler.Handle(new ListTagsQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().Equal(
            new TagResponse(first.Id, "Promoção", "#0d9488", "Campanha de outubro"),
            new TagResponse(second.Id, "VIP", "#0d9488", null));
    }

    [Fact]
    public async Task Handle_WithoutParameters_RequestsTheDefaultPageOnce()
    {
        var result = await _handler.Handle(new ListTagsQuery(), CancellationToken.None);

        result.Value.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(0);
        result.Value.Page.Should().Be(1);
        result.Value.PageSize.Should().Be(20);
        await _repository.Received(1).ListAsync(new TagListFilter(1, 20, null), CancellationToken.None);
    }

    [Fact]
    public async Task Handle_WithSearchAndPaging_PassesTheNormalizedFilterAndCancellation()
    {
        using var cancellation = new CancellationTokenSource();
        var tag = NewTag("VIP");
        Returns([tag], 7);
        var search = SearchText.Create("  VIP  ").Value;
        var query = new ListTagsQuery(search) { Page = 2, PageSize = 3 };

        var result = await _handler.Handle(query, cancellation.Token);

        result.Value.TotalCount.Should().Be(7);
        result.Value.Page.Should().Be(2);
        result.Value.PageSize.Should().Be(3);
        await _repository.Received(1).ListAsync(new TagListFilter(2, 3, "vip"), cancellation.Token);
    }

    [Fact]
    public async Task Handle_KeepsTheMetadataReturnedByTheRepository()
    {
        var tag = NewTag("VIP");
        var page = new PagedResult<Tag>([tag], 12, 3, 4);
        _repository.ListAsync(Arg.Any<TagListFilter>(), Arg.Any<CancellationToken>())
            .Returns(page);

        var result = await _handler.Handle(new ListTagsQuery(), CancellationToken.None);

        result.Value.TotalCount.Should().Be(12);
        result.Value.Page.Should().Be(3);
        result.Value.PageSize.Should().Be(4);
    }

    [Fact]
    public async Task Handle_WithAPagePastTheLast_ReturnsAnEmptyPageAndTheRealTotal()
    {
        Returns([], 3);

        var result = await _handler.Handle(new ListTagsQuery { Page = 9 }, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(3);
        result.Value.Page.Should().Be(9);
        _repository.ReceivedCalls().Should().ContainSingle();
    }
}
