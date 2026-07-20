using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.DeleteService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.DeleteService;

public class DeleteServiceCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithExistingService_RemovesItAndCommits()
    {
        var service = new Service(Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1);
        var repository = Substitute.For<IServiceRepository>();
        repository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new DeleteServiceCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(new DeleteServiceCommand(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        repository.Received(1).Remove(service);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
