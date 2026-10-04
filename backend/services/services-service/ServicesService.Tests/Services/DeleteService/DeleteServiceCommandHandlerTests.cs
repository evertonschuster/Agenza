using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.DeleteService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.DeleteService;

public class DeleteServiceCommandHandlerTests
{
    private readonly IServiceRepository _repository = Substitute.For<IServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly DeleteServiceCommandHandler _handler;

    public DeleteServiceCommandHandlerTests()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new DeleteServiceCommandHandler(
            _repository,
            _unitOfWork,
            Substitute.For<ILogger<DeleteServiceCommandHandler>>());
    }

    [Fact]
    public async Task Handle_WithExistingService_RemovesItAndCommits()
    {
        var service = ServiceTestData.NewService();
        _repository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new DeleteServiceCommand(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _repository.Received(1).Remove(service);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownServiceId_ReturnsNotFoundAndDoesNotSave()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _handler.Handle(new DeleteServiceCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Service.NotFound");
        _repository.DidNotReceive().Remove(Arg.Any<Service>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenTheDatabaseRejectsTheSave_ReturnsAGenericConflict()
    {
        var service = ServiceTestData.NewService();
        _repository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(
            PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_constraint")));

        var result = await _handler.Handle(new DeleteServiceCommand(service.Id), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.SaveFailed");
    }
}
