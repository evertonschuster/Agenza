using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.ReactivateService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.ReactivateService;

public class ReactivateServiceCommandHandlerTests
{
    private readonly IServiceRepository _repository = Substitute.For<IServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ReactivateServiceCommandHandler _handler;

    public ReactivateServiceCommandHandlerTests()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new ReactivateServiceCommandHandler(
            _repository,
            _unitOfWork,
            Substitute.For<ILogger<ReactivateServiceCommandHandler>>());
    }

    [Fact]
    public async Task Handle_WithAnInactiveService_ReactivatesItAndSaves()
    {
        var service = ServiceTestData.NewService();
        service.Inactivate();
        _repository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new ReactivateServiceCommand(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        service.Status.Should().Be(ServiceStatus.Active);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithAnActiveService_RefusesTheRepetitionAndDoesNotSave()
    {
        var service = ServiceTestData.NewService();
        _repository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new ReactivateServiceCommand(service.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be("Service.AlreadyActive");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownServiceId_ReturnsNotFoundAndDoesNotSave()
    {
        var unknownId = Guid.NewGuid();
        _repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _handler.Handle(new ReactivateServiceCommand(unknownId), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Service.NotFound");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenTheDatabaseRejectsTheSave_ReturnsAGenericConflict()
    {
        var service = ServiceTestData.NewService();
        service.Inactivate();
        _repository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(
            PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_constraint")));

        var result = await _handler.Handle(new ReactivateServiceCommand(service.Id), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.SaveFailed");
    }
}
