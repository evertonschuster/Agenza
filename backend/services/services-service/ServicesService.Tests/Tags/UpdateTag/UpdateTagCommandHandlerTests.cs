using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.UpdateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.UpdateTag;

public class UpdateTagCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new UpdateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new UpdateTagCommand(tag.Id, "Returning", "#ef4444", "Came back"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Returning");
        result.Value.Color.Should().Be("#ef4444");
        result.Value.Description.Should().Be("Came back");
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
