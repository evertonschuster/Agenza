using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.ListServices;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryHandlerTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly ListServicesQueryHandler _handler;

    public ListServicesQueryHandlerTests()
    {
        _categoryRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Category>());
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());
        _handler = new ListServicesQueryHandler(_serviceRepository, _categoryRepository, _tagRepository);
    }

    private void RepositoryReturns(IReadOnlyList<Service> services, int totalCount)
    {
        _serviceRepository.ListAsync(
                Arg.Any<int>(),
                Arg.Any<int>(),
                Arg.Any<string?>(),
                Arg.Any<Guid?>(),
                Arg.Any<IReadOnlyCollection<Guid>>(),
                Arg.Any<ServiceStatus?>(),
                Arg.Any<CancellationToken>())
            .Returns((services, totalCount));
    }

    [Fact]
    public async Task Handle_ReturnsTheServicesFromTheRepositoryWithTheirSituation()
    {
        var inactive = ServiceTestData.NewService("Massage", null, 2);
        inactive.Inactivate();
        RepositoryReturns([ServiceTestData.NewService("Haircut"), inactive], 2);

        var result = await _handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Select(item => (item.Name, item.Status)).Should()
            .Equal(("Haircut", "active"), ("Massage", "inactive"));
        result.Value.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task Handle_ReturnsThePricingAndTheTotalTimeOfEachService()
    {
        var variable = Service.Create(
            Guid.NewGuid(), "Session", null, null, null,
            ServiceTestData.Duration(50, 10, 5), PricingType.Variable, null, null, [], 1).Value;
        RepositoryReturns([ServiceTestData.NewService("Haircut", null, 2), variable], 2);

        var result = await _handler.Handle(new ListServicesQuery(), CancellationToken.None);

        var fixedItem = result.Value.Items.Single(item => item.Name == "Haircut");
        fixedItem.PricingType.Should().Be("fixed");
        fixedItem.Price.Should().Be(45.50m);
        fixedItem.TotalDurationMinutes.Should().Be(30);
        var variableItem = result.Value.Items.Single(item => item.Name == "Session");
        variableItem.PricingType.Should().Be("variable");
        variableItem.Price.Should().BeNull();
        variableItem.TotalDurationMinutes.Should().Be(65);
    }

    [Fact]
    public async Task Handle_WithNoServices_ReturnsAnEmptyPageWithoutReadingCategoriesOrTags()
    {
        RepositoryReturns([], 0);

        var result = await _handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(0);
        await _categoryRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
        await _tagRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ResolvesTheCategoryNameOfACategorizedService()
    {
        var category = ServiceTestData.NewCategory("Hair");
        RepositoryReturns([ServiceTestData.NewService("Haircut", category.Id)], 1);
        _categoryRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new[] { category });

        var result = await _handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.Value.Items.Should().ContainSingle().Which.CategoryName.Should().Be("Hair");
    }

    [Fact]
    public async Task Handle_ReadsEachReferencedCategoryOnce_NotTheWholeCatalog()
    {
        var category = ServiceTestData.NewCategory("Hair");
        RepositoryReturns(
            [
                ServiceTestData.NewService("Haircut", category.Id, 1),
                ServiceTestData.NewService("Trim", category.Id, 2),
                ServiceTestData.NewService("Manicure", null, 3),
            ],
            3);
        _categoryRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new[] { category });

        await _handler.Handle(new ListServicesQuery(), CancellationToken.None);

        await _categoryRepository.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 1 && ids.Contains(category.Id)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReadsTheTagsOfThePageInOneCallAndGivesEachServiceItsOwn()
    {
        var vip = ServiceTestData.NewTag("VIP");
        var premium = ServiceTestData.NewTag("Premium", "#ef4444");
        var promo = ServiceTestData.NewTag("Promo", "#f59e0b");
        RepositoryReturns(
            [
                ServiceTestData.NewService("Haircut", null, 1, [vip.Id, premium.Id]),
                ServiceTestData.NewService("Trim", null, 2, [vip.Id]),
                ServiceTestData.NewService("Manicure", null, 3, [promo.Id]),
                ServiceTestData.NewService("Massage", null, 4),
            ],
            4);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { premium, promo, vip });

        var result = await _handler.Handle(new ListServicesQuery(), CancellationToken.None);

        var items = result.Value.Items;
        items.Single(item => item.Name == "Haircut").Tags.Select(tag => tag.Name).Should().Equal("Premium", "VIP");
        items.Single(item => item.Name == "Trim").Tags.Select(tag => tag.Name).Should().Equal("VIP");
        items.Single(item => item.Name == "Manicure").Tags.Select(tag => tag.Name).Should().Equal("Promo");
        items.Single(item => item.Name == "Massage").Tags.Should().BeEmpty();
        await _tagRepository.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 3
                && ids.Contains(vip.Id) && ids.Contains(premium.Id) && ids.Contains(promo.Id)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithPageSmallerThanTheTotal_ReturnsTheRequestedPageAndTheTotalCount()
    {
        _serviceRepository.ListAsync(
                1, 2, Arg.Any<string?>(), Arg.Any<Guid?>(), Arg.Any<IReadOnlyCollection<Guid>>(),
                Arg.Any<ServiceStatus?>(), Arg.Any<CancellationToken>())
            .Returns((
                (IReadOnlyList<Service>)[ServiceTestData.NewService("Haircut", null, 1), ServiceTestData.NewService("Manicure", null, 2)],
                3));

        var result = await _handler.Handle(new ListServicesQuery(1, 2), CancellationToken.None);

        result.Value.Items.Should().HaveCount(2);
        result.Value.TotalCount.Should().Be(3);
        result.Value.Page.Should().Be(1);
        result.Value.PageSize.Should().Be(2);
    }

    [Fact]
    public async Task Handle_PassesTheSearchAndEveryFilterToTheRepository()
    {
        var categoryId = Guid.NewGuid();
        var firstTagId = Guid.NewGuid();
        var secondTagId = Guid.NewGuid();
        RepositoryReturns([], 0);

        await _handler.Handle(
            new ListServicesQuery(
                Search: "cut",
                CategoryId: categoryId,
                TagIds: [firstTagId, secondTagId],
                Status: "inactive"),
            CancellationToken.None);

        await _serviceRepository.Received(1).ListAsync(
            1,
            20,
            "cut",
            categoryId,
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { firstTagId, secondTagId })),
            ServiceStatus.Inactive,
            Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("all")]
    public async Task Handle_WithoutASituationFilter_ListsEveryService(string? status)
    {
        RepositoryReturns([], 0);

        await _handler.Handle(new ListServicesQuery(Status: status), CancellationToken.None);

        await _serviceRepository.Received(1).ListAsync(
            1, 20, null, null, Arg.Any<IReadOnlyCollection<Guid>>(), null, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithTheActiveSituation_ListsOnlyActiveServices()
    {
        RepositoryReturns([], 0);

        await _handler.Handle(new ListServicesQuery(Status: "active"), CancellationToken.None);

        await _serviceRepository.Received(1).ListAsync(
            1, 20, null, null, Arg.Any<IReadOnlyCollection<Guid>>(), ServiceStatus.Active, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithoutTagIds_AppliesNoTagFilter()
    {
        RepositoryReturns([], 0);

        await _handler.Handle(new ListServicesQuery(TagIds: null), CancellationToken.None);

        await _serviceRepository.Received(1).ListAsync(
            1, 20, null, null, Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 0), null, Arg.Any<CancellationToken>());
    }
}
