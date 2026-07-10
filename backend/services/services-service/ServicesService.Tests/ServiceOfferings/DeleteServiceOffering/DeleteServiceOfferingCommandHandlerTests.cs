using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.ServiceOfferings.DeleteServiceOffering;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.ServiceOfferings.DeleteServiceOffering;

public class DeleteServiceOfferingCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithExistingServiceOffering_RemovesItAndCommits()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.GetByIdAsync(serviceOffering.Id, Arg.Any<CancellationToken>()).Returns(serviceOffering);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteServiceOfferingCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new DeleteServiceOfferingCommand(serviceOffering.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        repository.Received(1).Remove(serviceOffering);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownServiceOfferingId_ReturnsNotFound()
    {
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((ServiceOffering?)null);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteServiceOfferingCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new DeleteServiceOfferingCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
