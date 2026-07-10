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
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(tenantId, tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        repository.NameExistsAsync(tenantId, "Returning", tag.Id, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new UpdateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new UpdateTagCommand(tenantId, tag.Id, "Returning", "#ef4444", "Came back"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Returning");
        result.Value.Color.Should().Be("#ef4444");
        result.Value.Description.Should().Be("Came back");
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_RenamingToItsOwnCurrentName_DoesNotConflict()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(tenantId, tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        repository.NameExistsAsync(tenantId, "VIP", tag.Id, Arg.Any<CancellationToken>()).Returns(false);
        var handler = new UpdateTagCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new UpdateTagCommand(tenantId, tag.Id, "VIP", "#ef4444", null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("VIP");
    }

    [Fact]
    public async Task Handle_RenamingToAnotherTagsName_ReturnsConflict()
    {
        var tenantId = Guid.NewGuid();
        var tagToRename = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(tenantId, tagToRename.Id, Arg.Any<CancellationToken>()).Returns(tagToRename);
        repository.NameExistsAsync(tenantId, "returning", tagToRename.Id, Arg.Any<CancellationToken>())
            .Returns(true);
        var handler = new UpdateTagCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new UpdateTagCommand(tenantId, tagToRename.Id, "returning", "#0d9488", null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Tag?)null);
        var handler = new UpdateTagCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new UpdateTagCommand(Guid.NewGuid(), Guid.NewGuid(), "VIP", "#0d9488", null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
    }

    [Fact]
    public async Task Handle_WithTagIdFromAnotherTenant_ReturnsNotFound()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        // GetByIdAsync is tenant-scoped by the real repository - a
        // request for a different tenant id than the tag's own returns
        // null, exactly like the caller passing an unknown tag id.
        repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Tag?)null);
        var handler = new UpdateTagCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new UpdateTagCommand(Guid.NewGuid(), tag.Id, "Renamed", "#0d9488", null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
    }

    [Fact]
    public async Task Handle_WithInvalidColor_ReturnsValidationErrorAndKeepsOriginalState()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = Substitute.For<ITagRepository>();
        repository.GetByIdAsync(tenantId, tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        repository.NameExistsAsync(tenantId, "VIP", tag.Id, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new UpdateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new UpdateTagCommand(tenantId, tag.Id, "VIP", "#123456", null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        tag.Color.Value.Should().Be("#0d9488");
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
