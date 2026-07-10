using ServicesService.Application.Abstractions;
using ServicesService.Application.ServiceOfferings.ListServiceOfferings;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.ServiceOfferings.ListServiceOfferings;

public class ListServiceOfferingsQueryHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsServiceOfferingsFromTheRepository()
    {
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.ListAsync(Arg.Any<CancellationToken>())
            .Returns(new[] { new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m) });
        var handler = new ListServiceOfferingsQueryHandler(repository);

        var result = await handler.Handle(new ListServiceOfferingsQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle().Which.Name.Should().Be("Haircut");
    }

    [Fact]
    public async Task Handle_WithNoServiceOfferings_ReturnsEmptyList()
    {
        var repository = Substitute.For<IServiceOfferingRepository>();
        repository.ListAsync(Arg.Any<CancellationToken>()).Returns(Array.Empty<ServiceOffering>());
        var handler = new ListServiceOfferingsQueryHandler(repository);

        var result = await handler.Handle(new ListServiceOfferingsQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }
}
