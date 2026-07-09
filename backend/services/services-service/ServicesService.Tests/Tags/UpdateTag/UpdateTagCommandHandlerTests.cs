using Admin.SharedKernel;
using ServicesService.Application.Tags.UpdateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Tests.TestDoubles;

namespace ServicesService.Tests.Tags.UpdateTag;

public class UpdateTagCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var unitOfWork = new FakeUnitOfWork();
        var handler = new UpdateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new UpdateTagCommand(tenantId, tag.Id, "Returning", "#ef4444", "Came back"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Returning");
        result.Value.Color.Should().Be("#ef4444");
        result.Value.Description.Should().Be("Came back");
        unitOfWork.SaveChangesCalls.Should().Be(1);
    }

    [Fact]
    public async Task Handle_RenamingToItsOwnCurrentName_DoesNotConflict()
    {
        var tenantId = Guid.NewGuid();
        var tag = new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null);
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var handler = new UpdateTagCommandHandler(repository, new FakeUnitOfWork());

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
        var repository = new FakeTagRepository();
        repository.Tags.Add(tagToRename);
        repository.Tags.Add(new Tag(Guid.NewGuid(), tenantId, "Returning", TagColor.From("#ef4444"), null));
        var handler = new UpdateTagCommandHandler(repository, new FakeUnitOfWork());

        var result = await handler.Handle(
            new UpdateTagCommand(tenantId, tagToRename.Id, "returning", "#0d9488", null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var handler = new UpdateTagCommandHandler(new FakeTagRepository(), new FakeUnitOfWork());

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
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var handler = new UpdateTagCommandHandler(repository, new FakeUnitOfWork());

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
        var repository = new FakeTagRepository();
        repository.Tags.Add(tag);
        var unitOfWork = new FakeUnitOfWork();
        var handler = new UpdateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new UpdateTagCommand(tenantId, tag.Id, "VIP", "#123456", null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        tag.Color.Value.Should().Be("#0d9488");
        unitOfWork.SaveChangesCalls.Should().Be(0);
    }
}
