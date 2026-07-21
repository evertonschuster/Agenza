using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.DeleteTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.DeleteTag;

public class DeleteTagCommandHandlerTests
{
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<DeleteTagCommandHandler> _logger =
        Substitute.For<ILogger<DeleteTagCommandHandler>>();
    private readonly DeleteTagCommandHandler _handler;

    public DeleteTagCommandHandlerTests()
    {
        _serviceRepository.CountByTagIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(0);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new DeleteTagCommandHandler(_tagRepository, _serviceRepository, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithExistingUnusedTag_RemovesItAndCommits()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _tagRepository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);

        var result = await _handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _tagRepository.Received(1).Remove(tag);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _tagRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Tag?)null);

        var result = await _handler.Handle(new DeleteTagCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
    }

    [Fact]
    public async Task Handle_WithTagInUse_ReturnsConflictAndDoesNotRemove()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _tagRepository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _serviceRepository.CountByTagIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(2);

        var result = await _handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.InUse");
        _tagRepository.DidNotReceive().Remove(Arg.Any<Tag>());
    }

    [Fact]
    public async Task Handle_WithConcurrentConflictAtSaveTime_ReturnsConflict()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _tagRepository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_other_unique_constraint")));

        var result = await _handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
    }
}
