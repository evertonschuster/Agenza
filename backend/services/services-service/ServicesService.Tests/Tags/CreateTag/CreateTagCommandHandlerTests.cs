using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.CreateTag;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Tags.CreateTag;

public class CreateTagCommandHandlerTests
{
    private readonly ITagRepository _repository = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<CreateTagCommandHandler> _logger =
        Substitute.For<ILogger<CreateTagCommandHandler>>();
    private readonly CreateTagCommandHandler _handler;

    public CreateTagCommandHandlerTests()
    {
        _repository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new CreateTagCommandHandler(_repository, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheTag()
    {
        var result = await _handler.Handle(
            new CreateTagCommand("VIP", "#0d9488", "High-value client"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("VIP");
        result.Value.Color.Should().Be("#0d9488");
        result.Value.Description.Should().Be("High-value client");
        // TenantId stays Guid.Empty here - AuditableEntitySaveChangesInterceptor
        // assigns it on save, which this handler-level test never runs.
        _repository.Received(1).Add(Arg.Is<Tag>(tag => tag.Id == result.Value.Id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDuplicateName_ReturnsConflictAndDoesNotPersist()
    {
        _repository.NameExistsAsync("VIP", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _handler.Handle(new CreateTagCommand("VIP", "#0d9488", null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateName");
        _repository.DidNotReceive().Add(Arg.Any<Tag>());
    }

    [Fact]
    public async Task Handle_WithConcurrentDuplicateNameAtSaveTime_ReturnsConflict()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Tags_TenantId_NameNormalized")));

        var result = await _handler.Handle(new CreateTagCommand("VIP", "#0d9488", null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateName");
    }

    [Fact]
    public async Task Handle_WithUnrecognizedConstraintAtSaveTime_ReturnsGenericConflictNotDuplicateName()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_other_unique_constraint")));

        var result = await _handler.Handle(new CreateTagCommand("VIP", "#0d9488", null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateConflict");
    }
}
