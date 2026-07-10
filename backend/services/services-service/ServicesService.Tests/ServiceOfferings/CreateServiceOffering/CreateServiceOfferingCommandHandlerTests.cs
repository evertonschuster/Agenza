using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.ServiceOfferings.CreateServiceOffering;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.ServiceOfferings.CreateServiceOffering;

public class CreateServiceOfferingCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheServiceOffering()
    {
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.NameExistsAsync("Haircut", null, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateServiceOfferingCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateServiceOfferingCommand("Haircut", "A classic cut", 30, 45.50m),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Haircut");
        result.Value.Description.Should().Be("A classic cut");
        result.Value.DurationMinutes.Should().Be(30);
        result.Value.Price.Should().Be(45.50m);
        repository.Received(1).Add(Arg.Is<ServiceOffering>(s => s.Id == result.Value.Id));
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDuplicateName_ReturnsConflictAndDoesNotPersist()
    {
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.NameExistsAsync("haircut", null, Arg.Any<CancellationToken>()).Returns(true);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateServiceOfferingCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateServiceOfferingCommand("haircut", null, 30, 45.50m), // case-insensitive match
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("ServiceOffering.DuplicateName");
        repository.DidNotReceive().Add(Arg.Any<ServiceOffering>());
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInvalidDuration_ThrowsAndDoesNotPersist()
    {
        var repository = Substitute.For<IServiceOfferingRepository>();
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateServiceOfferingCommandHandler(repository, unitOfWork);

        var act = () => handler.Handle(
            new CreateServiceOfferingCommand("Haircut", null, 0, 45.50m),
            CancellationToken.None);

        await act.Should().ThrowAsync<Domain.Exceptions.InvalidServiceOfferingException>();
        repository.DidNotReceive().Add(Arg.Any<ServiceOffering>());
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
