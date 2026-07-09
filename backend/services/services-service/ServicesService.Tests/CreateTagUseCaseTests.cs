using ServicesService.Application.Exceptions;
using ServicesService.Application.UseCases.CreateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;
using ServicesService.Domain.ValueObjects;
using ServicesService.Tests.TestDoubles;

namespace ServicesService.Tests;

public class CreateTagUseCaseTests
{
    [Fact]
    public async Task ExecuteAsync_WithValidRequest_PersistsAndReturnsTheTag()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTagRepository();
        var useCase = new CreateTagUseCase(repository);

        var result = await useCase.ExecuteAsync(
            new CreateTagRequest(tenantId, "VIP", "#0d9488", "High-value client"),
            CancellationToken.None);

        Assert.Single(repository.Tags);
        Assert.Equal(result.Id, repository.Tags[0].Id);
        Assert.Equal("VIP", result.Name);
        Assert.Equal("#0d9488", result.Color);
        Assert.Equal("High-value client", result.Description);
    }

    [Fact]
    public async Task ExecuteAsync_WithDuplicateNameInSameTenant_Throws()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTagRepository();
        repository.Tags.Add(new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null));
        var useCase = new CreateTagUseCase(repository);

        await Assert.ThrowsAsync<DuplicateTagNameException>(() => useCase.ExecuteAsync(
            new CreateTagRequest(tenantId, "vip", "#ef4444", null), // case-insensitive match
            CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_WithSameNameInDifferentTenant_Succeeds()
    {
        var repository = new FakeTagRepository();
        repository.Tags.Add(new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null));
        var useCase = new CreateTagUseCase(repository);

        var result = await useCase.ExecuteAsync(
            new CreateTagRequest(Guid.NewGuid(), "VIP", "#0d9488", null),
            CancellationToken.None);

        Assert.Equal("VIP", result.Name);
    }

    [Fact]
    public async Task ExecuteAsync_WithInvalidColor_ThrowsAndDoesNotPersist()
    {
        var repository = new FakeTagRepository();
        var useCase = new CreateTagUseCase(repository);

        await Assert.ThrowsAsync<InvalidTagException>(() => useCase.ExecuteAsync(
            new CreateTagRequest(Guid.NewGuid(), "VIP", "#123456", null),
            CancellationToken.None));

        Assert.Empty(repository.Tags);
    }
}
