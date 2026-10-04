using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.GetServiceById;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.GetServiceById;

public class GetServiceByIdQueryHandlerTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly GetServiceByIdQueryHandler _handler;

    public GetServiceByIdQueryHandlerTests()
    {
        _handler = new GetServiceByIdQueryHandler(_serviceRepository, _categoryRepository, _tagRepository);
    }

    [Fact]
    public async Task Handle_WithExistingService_ReturnsItsWholeContract()
    {
        var category = ServiceTestData.NewCategory("Hair");
        var vip = ServiceTestData.NewTag("VIP");
        var premium = ServiceTestData.NewTag("Premium", "#ef4444");
        var service = Service.Create(
            Guid.NewGuid(),
            "Haircut",
            category.Id,
            "Only for the team",
            "A classic cut",
            ServiceTestData.Duration(30, 10, 5, 15, 60),
            PricingType.Fixed,
            ServiceTestData.Price(),
            ServiceTestData.Discount(),
            [vip.Id, premium.Id],
            7).Value;
        service.Inactivate();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { premium, vip });

        var result = await _handler.Handle(new GetServiceByIdQuery(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var response = result.Value;
        response.Id.Should().Be(service.Id);
        response.Code.Should().Be(7);
        response.Name.Should().Be("Haircut");
        response.CategoryId.Should().Be(category.Id);
        response.CategoryName.Should().Be("Hair");
        response.Tags.Select(tag => tag.Name).Should().Equal("Premium", "VIP");
        response.InternalDescription.Should().Be("Only for the team");
        response.ClientDescription.Should().Be("A classic cut");
        response.DurationMinutes.Should().Be(30);
        response.PreparationMinutes.Should().Be(10);
        response.CleanupMinutes.Should().Be(5);
        response.TotalDurationMinutes.Should().Be(45);
        response.MinDurationMinutes.Should().Be(15);
        response.MaxDurationMinutes.Should().Be(60);
        response.PricingType.Should().Be("fixed");
        response.Price.Should().Be(45.50m);
        response.MaxDiscountPercentage.Should().Be(10m);
        response.Status.Should().Be("inactive");
    }

    [Fact]
    public async Task Handle_WithAVariablePricedService_ReturnsNoPrice()
    {
        var service = ServiceTestData.NewService(pricingType: PricingType.Variable, price: null);
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new GetServiceByIdQuery(service.Id), CancellationToken.None);

        result.Value.PricingType.Should().Be("variable");
        result.Value.Price.Should().BeNull();
    }

    [Fact]
    public async Task Handle_WithoutCategoryOrTags_ReadsNeitherOfThem()
    {
        var service = ServiceTestData.NewService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new GetServiceByIdQuery(service.Id), CancellationToken.None);

        result.Value.CategoryName.Should().BeNull();
        result.Value.Tags.Should().BeEmpty();
        await _categoryRepository.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await _tagRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReadsTheTagsOfTheServiceInOneCall()
    {
        var first = ServiceTestData.NewTag("VIP");
        var second = ServiceTestData.NewTag("Promo");
        var service = ServiceTestData.NewService(tagIds: [first.Id, second.Id]);
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { second, first });

        await _handler.Handle(new GetServiceByIdQuery(service.Id), CancellationToken.None);

        await _tagRepository.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 2 && ids.Contains(first.Id) && ids.Contains(second.Id)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownServiceId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _serviceRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _handler.Handle(new GetServiceByIdQuery(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Service.NotFound");
    }
}
