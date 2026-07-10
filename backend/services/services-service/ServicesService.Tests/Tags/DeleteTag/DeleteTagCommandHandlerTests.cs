using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.DeleteTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.DeleteTag;

public class DeleteTagCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithExistingTag_RemovesItAndCommits()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(tenantId, tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new DeleteTagCommand(tenantId, tag.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        repository.Received(1).Remove(tag);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Tag?)null);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new DeleteTagCommand(Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithTagIdFromAnotherTenant_ReturnsNotFoundAndDoesNotRemove()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        // GetByIdAsync is tenant-scoped by the real repository - a
        // request for a different tenant id than the tag's own returns
        // null, exactly like the caller passing an unknown tag id.
        repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Tag?)null);
        var handler = new DeleteTagCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new DeleteTagCommand(Guid.NewGuid(), tag.Id),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        repository.DidNotReceive().Remove(Arg.Any<Tag>());
    }
}
