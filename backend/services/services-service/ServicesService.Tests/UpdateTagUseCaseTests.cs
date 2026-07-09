using ServicesService.Application.Exceptions;
using ServicesService.Application.UseCases.UpdateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;
using ServicesService.Domain.ValueObjects;
using ServicesService.Tests.TestDoubles;

namespace ServicesService.Tests;

public class UpdateTagUseCaseTests
{
    [Fact]
    public async Task ExecuteAsync_WithValidRequest_UpdatesAndPersists()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var useCase = new UpdateTagUseCase(repository);

        var result = await useCase.ExecuteAsync(
            new UpdateTagRequest(tenantId, tag.Id, "Returning", "#ef4444", "Came back"),
            CancellationToken.None);

        Assert.Equal("Returning", result.Name);
        Assert.Equal("#ef4444", result.Color);
        Assert.Equal("Came back", result.Description);
        Assert.Equal(1, repository.SaveChangesCalls);
    }

    [Fact]
    public async Task ExecuteAsync_RenamingToItsOwnCurrentName_DoesNotConflict()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var useCase = new UpdateTagUseCase(repository);

        var result = await useCase.ExecuteAsync(
            new UpdateTagRequest(tenantId, tag.Id, "VIP", "#ef4444", null),
            CancellationToken.None);

        Assert.Equal("VIP", result.Name);
    }

    [Fact]
    public async Task ExecuteAsync_RenamingToAnotherTagsName_Throws()
    {
        var tenantId = Guid.NewGuid();
        var tagToRename = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tagToRename);
        repository.Tags.Add(new Tag(Guid.NewGuid(), tenantId, "Returning", TagColor.From("#ef4444"), null));
        var useCase = new UpdateTagUseCase(repository);

        await Assert.ThrowsAsync<DuplicateTagNameException>(() => useCase.ExecuteAsync(
            new UpdateTagRequest(tenantId, tagToRename.Id, "returning", "#0d9488", null),
            CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_WithUnknownTagId_Throws()
    {
        var useCase = new UpdateTagUseCase(new FakeTagRepository());

        await Assert.ThrowsAsync<TagNotFoundException>(() => useCase.ExecuteAsync(
            new UpdateTagRequest(Guid.NewGuid(), Guid.NewGuid(), "VIP", "#0d9488", null),
            CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_WithTagIdFromAnotherTenant_ThrowsNotFound()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var useCase = new UpdateTagUseCase(repository);

        await Assert.ThrowsAsync<TagNotFoundException>(() => useCase.ExecuteAsync(
            new UpdateTagRequest(Guid.NewGuid(), tag.Id, "Renamed", "#0d9488", null),
            CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_WithInvalidColor_ThrowsAndKeepsOriginalState()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var useCase = new UpdateTagUseCase(repository);

        await Assert.ThrowsAsync<InvalidTagException>(() => useCase.ExecuteAsync(
            new UpdateTagRequest(tenantId, tag.Id, "VIP", "#123456", null),
            CancellationToken.None));

        Assert.Equal("#0d9488", tag.Color.Value);
    }
}
