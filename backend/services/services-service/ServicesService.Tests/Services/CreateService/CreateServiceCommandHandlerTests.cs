using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.CreateService;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services.CreateService;

public class CreateServiceCommandHandlerTests
{
    private static CreateServiceCommandHandler CreateHandler(
        out IServiceRepository serviceRepository,
        out ICategoryRepository categoryRepository,
        out ITagRepository tagRepository,
        out IServiceCodeGenerator serviceCodeGenerator,
        out IUnitOfWork unitOfWork)
    {
        serviceRepository = Substitute.For<IServiceRepository>();
        categoryRepository = Substitute.For<ICategoryRepository>();
        tagRepository = Substitute.For<ITagRepository>();
        serviceCodeGenerator = Substitute.For<IServiceCodeGenerator>();
        serviceCodeGenerator.GetNextCodeAsync(Arg.Any<CancellationToken>()).Returns(1);
        unitOfWork = Substitute.For<IUnitOfWork>();
        return new CreateServiceCommandHandler(
            serviceRepository, categoryRepository, tagRepository, serviceCodeGenerator, unitOfWork);
    }

    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheService()
    {
        var handler = CreateHandler(
            out var serviceRepository, out _, out _, out var serviceCodeGenerator, out var unitOfWork);

        var result = await handler.Handle(
            new CreateServiceCommand("Haircut", "A classic cut", 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Haircut");
        result.Value.Code.Should().Be(1);
        result.Value.MinDurationMinutes.Should().Be(15);
        result.Value.MaxDurationMinutes.Should().Be(60);
        result.Value.MaxDiscountPercentage.Should().Be(10m);
        result.Value.CategoryId.Should().BeNull();
        result.Value.CategoryName.Should().BeNull();
        result.Value.Tags.Should().BeEmpty();
        await serviceCodeGenerator.Received(1).GetNextCodeAsync(Arg.Any<CancellationToken>());
        serviceRepository.Received(1).Add(Arg.Is<Service>(s => s.Id == result.Value.Id));
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithValidCategoryAndTags_SetsThemOnTheService()
    {
        var handler = CreateHandler(
            out var serviceRepository, out var categoryRepository, out var tagRepository, out _, out var unitOfWork);
        var category = new Category(Guid.NewGuid(), "Hair");
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, category.Id, [tag.Id]),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CategoryId.Should().Be(category.Id);
        result.Value.CategoryName.Should().Be("Hair");
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
