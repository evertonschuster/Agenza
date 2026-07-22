using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.ListTags;

public class ListTagsQueryHandlerTests
{
    private static readonly TagColor Teal = TagColor.Create("#0d9488").Value;

    [Fact]
    public async Task Handle_ReturnsTagsFromTheRepository()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.ListAsync(Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(new[] { Tag.Create(Guid.NewGuid(), "VIP", Teal, null).Value });
        var handler = new ListTagsQueryHandler(repository);

        var result = await handler.Handle(new ListTagsQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle().Which.Name.Should().Be("VIP");
    }

    [Fact]
    public async Task Handle_WithNoTags_ReturnsEmptyList()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.ListAsync(Arg.Any<string?>(), Arg.Any<CancellationToken>()).Returns(Array.Empty<Tag>());
        var handler = new ListTagsQueryHandler(repository);

        var result = await handler.Handle(new ListTagsQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }

    [Fact]
    public async Task Handle_PassesTheSearchTermToTheRepository()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.ListAsync("VIP", Arg.Any<CancellationToken>())
            .Returns(new[] { Tag.Create(Guid.NewGuid(), "VIP", Teal, null).Value });
        var handler = new ListTagsQueryHandler(repository);

        var result = await handler.Handle(new ListTagsQuery(Search: "VIP"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle().Which.Name.Should().Be("VIP");
    }
}
