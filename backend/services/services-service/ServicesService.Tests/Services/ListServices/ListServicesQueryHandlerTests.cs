using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services;
using ServicesService.Application.Services.ListServices;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryHandlerTests
{
    private static ListServicesQueryHandler CreateHandler(
        out IServiceRepository serviceRepository, out ICategoryRepository categoryRepository)
    {
        serviceRepository = Substitute.For<IServiceRepository>();
        categoryRepository = Substitute.For<ICategoryRepository>();
        categoryRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Category>());
        Returns(serviceRepository, [], 0);
        return new ListServicesQueryHandler(serviceRepository, categoryRepository);
    }

    private static void Returns(IServiceRepository serviceRepository, IReadOnlyList<Service> services, int totalCount)
    {
        serviceRepository
            .ListAsync(Arg.Any<ServiceListFilter>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var filter = callInfo.Arg<ServiceListFilter>();
                return Task.FromResult(new PagedResult<Service>(services, totalCount, filter.Page, filter.PageSize));
            });
    }

    private static Service NewService(string name, Guid? categoryId, int code)
    {
        return Service.Create(Guid.NewGuid(), name, null, DurationRange.Create(15, 30, 60).Value, 45.50m, 10m, categoryId, code).Value;
    }

    [Fact]
    public async Task Handle_ReturnsServicesFromTheRepository()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        Returns(serviceRepository, [NewService("Haircut", null, 1)], 1);

        var result = await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().ContainSingle().Which.Name.Should().Be("Haircut");
        result.Value.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task Handle_WithNoServices_ReturnsEmptyListAndDoesNotQueryCategories()
    {
        var handler = CreateHandler(out _, out var categoryRepository);

        var result = await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(0);
        await categoryRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithACategorizedService_ResolvesTheCategoryName()
    {
        var handler = CreateHandler(out var serviceRepository, out var categoryRepository);
        var category = Category.Create(Guid.NewGuid(), "Hair").Value!;
        Returns(serviceRepository, [NewService("Haircut", category.Id, 1)], 1);
        categoryRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new[] { category });

        var result = await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.Value.Items.Should().ContainSingle().Which.CategoryName.Should().Be("Hair");
    }

    [Fact]
    public async Task Handle_WithAServiceWithoutACategory_ReturnsNoCategoryName()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        Returns(serviceRepository, [NewService("Haircut", null, 1)], 1);

        var result = await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.Value.Items.Should().ContainSingle().Which.CategoryName.Should().BeNull();
    }

    [Fact]
    public async Task Handle_OnlyQueriesTheDistinctCategoriesReferencedByThisPage_NotTheWholeCatalog()
    {
        var handler = CreateHandler(out var serviceRepository, out var categoryRepository);
        var category = Category.Create(Guid.NewGuid(), "Hair").Value!;
        Returns(
            serviceRepository,
            [
                NewService("Haircut", category.Id, 1),
                NewService("Trim", category.Id, 2),
                NewService("Manicure", null, 3),
            ],
            3);
        categoryRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new[] { category });

        await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        await categoryRepository.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(
                ids => ids != null && ids.Count == 1 && ids.Contains(category.Id)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithPageSizeSmallerThanTotal_ReturnsRequestedPageAndTotalCount()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        Returns(serviceRepository, [NewService("Haircut", null, 1), NewService("Manicure", null, 2)], 3);

        var result = await handler.Handle(new ListServicesQuery { Page = 1, PageSize = 2 }, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().HaveCount(2);
        result.Value.TotalCount.Should().Be(3);
        result.Value.Page.Should().Be(1);
        result.Value.PageSize.Should().Be(2);
    }

    [Fact]
    public async Task Handle_WithAPagePastTheLast_ReturnsAnEmptyPageAndTheTotal()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        Returns(serviceRepository, [], 3);

        var result = await handler.Handle(new ListServicesQuery { Page = 9, PageSize = 20 }, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(3);
        result.Value.Page.Should().Be(9);
    }

    [Fact]
    public async Task Handle_PassesTheFiltersAndThePageToTheRepositoryAsOneFilter()
    {
        var handler = CreateHandler(out var serviceRepository, out _);
        var categoryId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var search = SearchText.Create("  Cut ").Value;

        var result = await handler.Handle(
            new ListServicesQuery(Search: search, CategoryId: categoryId, TagId: tagId) { Page = 2, PageSize = 5 },
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        await serviceRepository.Received(1).ListAsync(
            Arg.Is(new ServiceListFilter(2, 5, "cut", categoryId, tagId)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithoutFilters_AsksForTheFirstPageWithNoFilter()
    {
        var handler = CreateHandler(out var serviceRepository, out _);

        await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        await serviceRepository.Received(1).ListAsync(
            Arg.Is(new ServiceListFilter(1, 20, null, null, null)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_OnlyReads()
    {
        var handler = CreateHandler(out var serviceRepository, out _);

        await handler.Handle(new ListServicesQuery(), CancellationToken.None);

        await serviceRepository.DidNotReceive().UpdateAsync(Arg.Any<Service>(), Arg.Any<CancellationToken>());
        serviceRepository.DidNotReceive().Add(Arg.Any<Service>());
        serviceRepository.DidNotReceive().Remove(Arg.Any<Service>());
    }
}
