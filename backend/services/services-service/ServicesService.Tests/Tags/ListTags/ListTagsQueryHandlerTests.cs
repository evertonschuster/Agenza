using ServicesService.Application.Tags.ListTags;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Tests.TestDoubles;

namespace ServicesService.Tests.Tags.ListTags;

public class ListTagsQueryHandlerTests
{
    private static readonly TagColor Teal = TagColor.From("#0d9488");

    [Fact]
    public async Task Handle_ReturnsOnlyTagsForTheRequestedTenant()
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var repository = new FakeTagRepository();
        repository.Tags.Add(new Tag(Guid.NewGuid(), tenantId, "VIP", Teal, null));
        repository.Tags.Add(new Tag(Guid.NewGuid(), otherTenantId, "Not mine", Teal, null));
        var handler = new ListTagsQueryHandler(repository);

        var result = await handler.Handle(new ListTagsQuery(tenantId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle().Which.Name.Should().Be("VIP");
    }

    [Fact]
    public async Task Handle_WithNoTags_ReturnsEmptyList()
    {
        var handler = new ListTagsQueryHandler(new FakeTagRepository());

        var result = await handler.Handle(new ListTagsQuery(Guid.NewGuid()), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }
}
