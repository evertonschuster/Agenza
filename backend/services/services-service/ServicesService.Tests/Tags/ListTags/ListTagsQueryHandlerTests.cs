using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.ListTags;

public class ListTagsQueryHandlerTests
{
    private static readonly TagColor Teal = TagColor.From("#0d9488");

    [Fact]
    public async Task Handle_ReturnsOnlyTagsForTheRequestedTenant()
    {
        var tenantId = Guid.NewGuid();
        var repository = Substitute.For<ITagRepository>();
        repository.ListAsync(tenantId, Arg.Any<CancellationToken>())
            .Returns(new[] { new Tag(Guid.NewGuid(), tenantId, "VIP", Teal, null) });
        var handler = new ListTagsQueryHandler(repository);

        var result = await handler.Handle(new ListTagsQuery(tenantId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle().Which.Name.Should().Be("VIP");
    }

    [Fact]
    public async Task Handle_WithNoTags_ReturnsEmptyList()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.ListAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Tag>());
        var handler = new ListTagsQueryHandler(repository);

        var result = await handler.Handle(new ListTagsQuery(Guid.NewGuid()), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }
}
