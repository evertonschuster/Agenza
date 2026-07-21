using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.ListServices;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryHandlerTests
{
    private static ListServicesQueryHandler CreateHandler(
        out IServiceRepository serviceRepository, out ICategoryRepository categoryRepository)
    {
        serviceRepository = Substitute.For<IServiceRepository>();
        categoryRepository = Substitute.For<ICategoryRepository>();
        categoryRepository.ListAsync(Arg.Any<string?>(), Arg.Any<CancellationToken>()).Returns(new List<Category>());
        return new ListServicesQueryHandler(serviceRepository, categoryRepository);
    }

    [Fact]
    public async Task Handle_ReturnsServicesFromTheRepository()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        var service = new Service(Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1);
        serviceRepository.ListAsync(
            Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string?>(), Arg.Any<Guid?>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns((new List<Service> { service }, 1));

        var result = await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().ContainSingle().Which.Name.Should().Be("Haircut");
        result.Value.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task Handle_WithNoServices_ReturnsEmptyList()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        serviceRepository.ListAsync(
            Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string?>(), Arg.Any<Guid?>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns((new List<Service>(), 0));

        var result = await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task Handle_WithACategorizedService_ResolvesTheCategoryName()
    {
        var handler = CreateHandler(out var serviceRepository, out var categoryRepository);
        var category = new Category(Guid.NewGuid(), "Hair");
        var service = new Service(Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, 10m, category.Id, 1);
        serviceRepository.ListAsync(
            Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string?>(), Arg.Any<Guid?>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns((new List<Service> { service }, 1));
        categoryRepository.ListAsync(Arg.Any<string?>(), Arg.Any<CancellationToken>()).Returns(new[] { category });

        var result = await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.Value.Items.Should().ContainSingle().Which.CategoryName.Should().Be("Hair");
    }

    [Fact]
    public async Task Handle_WithPageSizeSmallerThanTotal_ReturnsRequestedPageAndTotalCount()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        var services = new List<Service>
        {
            new(Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1),
            new(Guid.NewGuid(), "Manicure", null, 30, 15, 60, 45.50m, 10m, null, 2),
        };
        serviceRepository.ListAsync(1, 2, Arg.Any<string?>(), Arg.Any<Guid?>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns((services, 3));

        var result = await handler.Handle(new ListServicesQuery(1, 2), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().HaveCount(2);
        result.Value.TotalCount.Should().Be(3);
        result.Value.Page.Should().Be(1);
        result.Value.PageSize.Should().Be(2);
    }

    [Fact]
    public async Task Handle_PassesSearchAndFilterIdsToTheRepository()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        var categoryId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        serviceRepository.ListAsync(1, 20, "cut", categoryId, tagId, Arg.Any<CancellationToken>())
            .Returns((new List<Service>(), 0));

        var result = await handler.Handle(
            new ListServicesQuery(Search: "cut", CategoryId: categoryId, TagId: tagId),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        await serviceRepository.Received(1).ListAsync(1, 20, "cut", categoryId, tagId, Arg.Any<CancellationToken>());
    }
}
