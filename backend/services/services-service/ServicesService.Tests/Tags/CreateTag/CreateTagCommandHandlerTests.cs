using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.CreateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;

namespace ServicesService.Tests.Tags.CreateTag;

public class CreateTagCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheTag()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.NameExistsAsync("VIP", null, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand("VIP", "#0d9488", "High-value client"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("VIP");
        result.Value.Color.Should().Be("#0d9488");
        result.Value.Description.Should().Be("High-value client");
        // TenantId stays Guid.Empty here - AuditableEntitySaveChangesInterceptor
        // assigns it on save, which this handler-level test never runs.
        repository.Received(1).Add(Arg.Is<Tag>(tag => tag.Id == result.Value.Id));
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDuplicateName_ReturnsConflictAndDoesNotPersist()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.NameExistsAsync("vip", null, Arg.Any<CancellationToken>()).Returns(true);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand("vip", "#ef4444", null), // case-insensitive match
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateName");
        repository.DidNotReceive().Add(Arg.Any<Tag>());
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInvalidColor_ThrowsAndDoesNotPersist()
    {
        var repository = Substitute.For<ITagRepository>();
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var act = () => handler.Handle(
            new CreateTagCommand("VIP", "#123456", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidTagException>();
        repository.DidNotReceive().Add(Arg.Any<Tag>());
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
