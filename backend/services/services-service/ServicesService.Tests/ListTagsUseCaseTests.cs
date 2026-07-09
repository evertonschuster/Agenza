using ServicesService.Application.UseCases.ListTags;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Tests.TestDoubles;

namespace ServicesService.Tests;

public class ListTagsUseCaseTests
{
    private static readonly TagColor Teal = TagColor.From("#0d9488");

    [Fact]
    public async Task ExecuteAsync_ReturnsOnlyTagsForTheRequestedTenant()
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var repository = new FakeTagRepository();
        repository.Tags.Add(new Tag(Guid.NewGuid(), tenantId, "VIP", Teal, null));
        repository.Tags.Add(new Tag(Guid.NewGuid(), otherTenantId, "Not mine", Teal, null));
        var useCase = new ListTagsUseCase(repository);

        var result = await useCase.ExecuteAsync(new ListTagsRequest(tenantId), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("VIP", result[0].Name);
    }

    [Fact]
    public async Task ExecuteAsync_WithNoTags_ReturnsEmptyList()
    {
        var useCase = new ListTagsUseCase(new FakeTagRepository());

        var result = await useCase.ExecuteAsync(new ListTagsRequest(Guid.NewGuid()), CancellationToken.None);

        Assert.Empty(result);
    }
}
