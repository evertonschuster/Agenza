using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.ServiceOfferings.UpdateServiceOffering;
using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;

namespace ServicesService.Tests.ServiceOfferings.UpdateServiceOffering;

public class UpdateServiceOfferingCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.GetByIdAsync(serviceOffering.Id, Arg.Any<CancellationToken>()).Returns(serviceOffering);
        repository.NameExistsAsync("Massage", serviceOffering.Id, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new UpdateServiceOfferingCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new UpdateServiceOfferingCommand(serviceOffering.Id, "Massage", "Relaxing", 60, 90.00m),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Massage");
        result.Value.Description.Should().Be("Relaxing");
        result.Value.DurationMinutes.Should().Be(60);
        result.Value.Price.Should().Be(90.00m);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_RenamingToItsOwnCurrentName_DoesNotConflict()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.GetByIdAsync(serviceOffering.Id, Arg.Any<CancellationToken>()).Returns(serviceOffering);
        repository.NameExistsAsync("Haircut", serviceOffering.Id, Arg.Any<CancellationToken>()).Returns(false);
        var handler = new UpdateServiceOfferingCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new UpdateServiceOfferingCommand(serviceOffering.Id, "Haircut", null, 45, 50.00m),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Haircut");
    }

    [Fact]
    public async Task Handle_RenamingToAnotherServiceOfferingsName_ReturnsConflict()
    {
        var toRename = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.GetByIdAsync(toRename.Id, Arg.Any<CancellationToken>()).Returns(toRename);
        repository.NameExistsAsync("massage", toRename.Id, Arg.Any<CancellationToken>()).Returns(true);
        var handler = new UpdateServiceOfferingCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new UpdateServiceOfferingCommand(toRename.Id, "massage", null, 30, 45.50m),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
    }

    [Fact]
    public async Task Handle_WithUnknownServiceOfferingId_ReturnsNotFound()
    {
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((ServiceOffering?)null);
        var handler = new UpdateServiceOfferingCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new UpdateServiceOfferingCommand(Guid.NewGuid(), "Haircut", null, 30, 45.50m),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
    }

    [Fact]
    public async Task Handle_WithInvalidDuration_ThrowsAndKeepsOriginalState()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.GetByIdAsync(serviceOffering.Id, Arg.Any<CancellationToken>()).Returns(serviceOffering);
        repository.NameExistsAsync("Haircut", serviceOffering.Id, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new UpdateServiceOfferingCommandHandler(repository, unitOfWork);

        var act = () => handler.Handle(
            new UpdateServiceOfferingCommand(serviceOffering.Id, "Haircut", null, 0, 45.50m),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidServiceOfferingException>();
        serviceOffering.DurationMinutes.Should().Be(30);
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
