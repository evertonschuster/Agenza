using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.DeleteService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.DeleteService;

public class DeleteServiceCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithExistingService_RemovesItAndCommits()
    {
        var service = Service.Create(Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1).Value;
        var repository = Substitute.For<IServiceRepository>();
        repository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        var handler = new DeleteServiceCommandHandler(
            repository, unitOfWork, Substitute.For<ILogger<DeleteServiceCommandHandler>>());

        var result = await handler.Handle(new DeleteServiceCommand(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        repository.Received(1).Remove(service);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownServiceId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        var repository = Substitute.For<IServiceRepository>();
        repository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteServiceCommandHandler(
            repository, unitOfWork, Substitute.For<ILogger<DeleteServiceCommandHandler>>());

        var result = await handler.Handle(new DeleteServiceCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Service.NotFound");
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithConcurrentConflictAtSaveTime_ReturnsConflict()
    {
        var service = Service.Create(Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1).Value;
        var repository = Substitute.For<IServiceRepository>();
        repository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_other_unique_constraint")));
        var handler = new DeleteServiceCommandHandler(
            repository, unitOfWork, Substitute.For<ILogger<DeleteServiceCommandHandler>>());

        var result = await handler.Handle(new DeleteServiceCommand(service.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
    }
}
