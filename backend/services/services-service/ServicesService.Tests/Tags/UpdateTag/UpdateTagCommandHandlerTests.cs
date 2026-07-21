using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.UpdateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.UpdateTag;

public class UpdateTagCommandHandlerTests
{
    private readonly ITagRepository _repository = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<UpdateTagCommandHandler> _logger =
        Substitute.For<ILogger<UpdateTagCommandHandler>>();
    private readonly UpdateTagCommandHandler _handler;

    public UpdateTagCommandHandlerTests()
    {
        _repository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _handler = new UpdateTagCommandHandler(_repository, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        _repository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);

        var result = await _handler.Handle(
            new UpdateTagCommand(tag.Id, "Returning", "#ef4444", "Came back"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Returning");
        result.Value.Color.Should().Be("#ef4444");
        result.Value.Description.Should().Be("Came back");
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Tag?)null);

        var result = await _handler.Handle(
            new UpdateTagCommand(unknownId, "VIP", "#0d9488", null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
    }

    [Fact]
    public async Task Handle_RenamingToAnotherTagsName_ReturnsConflict()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        _repository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _repository.NameExistsAsync("Returning", tag.Id, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _handler.Handle(
            new UpdateTagCommand(tag.Id, "Returning", "#0d9488", null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateName");
    }

    [Fact]
    public async Task Handle_LoadsTheTagExactlyOnce()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        _repository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);

        await _handler.Handle(new UpdateTagCommand(tag.Id, "Returning", "#0d9488", null), CancellationToken.None);

        await _repository.Received(1).GetByIdAsync(tag.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithConcurrentDuplicateNameAtSaveTime_ReturnsConflict()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        _repository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<Task<int>>(_ => throw new DuplicateEntityException(
                new InvalidOperationException(), "IX_Tags_TenantId_NameNormalized"));

        var result = await _handler.Handle(
            new UpdateTagCommand(tag.Id, "Returning", "#0d9488", null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateName");
    }

    [Fact]
    public async Task Handle_WithUnrecognizedConstraintAtSaveTime_ReturnsGenericConflictNotDuplicateName()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        _repository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<Task<int>>(_ => throw new DuplicateEntityException(
                new InvalidOperationException(), "some_other_unique_constraint"));

        var result = await _handler.Handle(
            new UpdateTagCommand(tag.Id, "Returning", "#0d9488", null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateConflict");
    }
}
