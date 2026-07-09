using Admin.SharedKernel;
using ServicesService.Application.Tags.DeleteTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Tests.TestDoubles;

namespace ServicesService.Tests.Tags.DeleteTag;

public class DeleteTagCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithExistingTag_RemovesItAndCommits()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var unitOfWork = new FakeUnitOfWork();
        var handler = new DeleteTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new DeleteTagCommand(tenantId, tag.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        repository.Tags.Should().BeEmpty();
        unitOfWork.SaveChangesCalls.Should().Be(1);
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var unitOfWork = new FakeUnitOfWork();
        var handler = new DeleteTagCommandHandler(new FakeTagRepository(), unitOfWork);

        var result = await handler.Handle(
            new DeleteTagCommand(Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        unitOfWork.SaveChangesCalls.Should().Be(0);
    }

    [Fact]
    public async Task Handle_WithTagIdFromAnotherTenant_ReturnsNotFoundAndDoesNotRemove()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var handler = new DeleteTagCommandHandler(repository, new FakeUnitOfWork());

        var result = await handler.Handle(
            new DeleteTagCommand(Guid.NewGuid(), tag.Id),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        repository.Tags.Should().ContainSingle();
    }
}
