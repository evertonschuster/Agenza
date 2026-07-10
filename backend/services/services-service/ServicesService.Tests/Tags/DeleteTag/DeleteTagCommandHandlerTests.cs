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
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        repository.Received(1).Remove(tag);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Tag?)null);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new DeleteTagCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
