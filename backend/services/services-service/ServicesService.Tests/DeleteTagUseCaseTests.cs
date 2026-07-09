using ServicesService.Application.Exceptions;
using ServicesService.Application.UseCases.DeleteTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Tests.TestDoubles;

namespace ServicesService.Tests;

public class DeleteTagUseCaseTests
{
    [Fact]
    public async Task ExecuteAsync_WithExistingTag_RemovesIt()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var useCase = new DeleteTagUseCase(repository);

        await useCase.ExecuteAsync(new DeleteTagRequest(tenantId, tag.Id), CancellationToken.None);

        Assert.Empty(repository.Tags);
    }

    [Fact]
    public async Task ExecuteAsync_WithUnknownTagId_Throws()
    {
        var useCase = new DeleteTagUseCase(new FakeTagRepository());

        await Assert.ThrowsAsync<TagNotFoundException>(() => useCase.ExecuteAsync(
            new DeleteTagRequest(Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_WithTagIdFromAnotherTenant_ThrowsAndDoesNotRemove()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var useCase = new DeleteTagUseCase(repository);

        await Assert.ThrowsAsync<TagNotFoundException>(() => useCase.ExecuteAsync(
            new DeleteTagRequest(Guid.NewGuid(), tag.Id),
            CancellationToken.None));

        Assert.Single(repository.Tags);
    }
}
