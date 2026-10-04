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
                Arg.Any<Guid?>(),
                Arg.Any<CancellationToken>())
            .Returns((services, totalCount));
    }

    [Fact]
    public async Task Handle_ReturnsTheServicesFromTheRepository()
    {
        RepositoryReturns([ServiceTestData.NewService("Haircut")], 1);

        var result = await _handler.Handle(new ListServicesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().ContainSingle().Which.Name.Should().Be("Haircut");
        result.Value.TotalCount.Should().Be(1);
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
                1, 2, Arg.Any<string?>(), Arg.Any<Guid?>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
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
    public async Task Handle_PassesTheSearchAndTheFiltersToTheRepository()
    {
        var categoryId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        _serviceRepository.ListAsync(1, 20, "cut", categoryId, tagId, Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Service>)[], 0));

        var result = await _handler.Handle(
            new ListServicesQuery(Search: "cut", CategoryId: categoryId, TagId: tagId),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        await _serviceRepository.Received(1).ListAsync(1, 20, "cut", categoryId, tagId, Arg.Any<CancellationToken>());
    }
}
