using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.CreateTag;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Tags.CreateTag;

public class CreateTagCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheTag()
    {
        var repository = Substitute.For<ITagRepository>();
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand("VIP", "#0d9488", "High-value client"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("VIP");
        result.Value.Color.Should().Be("#0d9488");
        result.Value.Description.Should().Be("High-value client");
        // TenantId stays Guid.Empty here - AuditableEntitySaveChangesInterceptor
        // assigns it on save, which this handler-level test never runs.
        repository.Received(1).Add(Arg.Is<Tag>(tag => tag.Id == result.Value.Id));
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
