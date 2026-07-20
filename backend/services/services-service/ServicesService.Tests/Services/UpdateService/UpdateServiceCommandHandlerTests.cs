using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.UpdateService;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services.UpdateService;

public class UpdateServiceCommandHandlerTests
{
    private static Service ValidService() =>
        new(Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1);

    private static UpdateServiceCommandHandler CreateHandler(
        out IServiceRepository serviceRepository,
        out ICategoryRepository categoryRepository,
        out ITagRepository tagRepository,
        out IUnitOfWork unitOfWork)
    {
        serviceRepository = Substitute.For<IServiceRepository>();
        categoryRepository = Substitute.For<ICategoryRepository>();
        tagRepository = Substitute.For<ITagRepository>();
        unitOfWork = Substitute.For<IUnitOfWork>();
        return new UpdateServiceCommandHandler(serviceRepository, categoryRepository, tagRepository, unitOfWork);
    }

    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var service = ValidService();
        var handler = CreateHandler(out var serviceRepository, out _, out _, out var unitOfWork);
        serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await handler.Handle(
            new UpdateServiceCommand(service.Id, "Massage", "Relaxing", 90, 60, 120, 90.00m, 25m, null, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Massage");
        result.Value.DurationMinutes.Should().Be(90);
        result.Value.MinDurationMinutes.Should().Be(60);
        result.Value.MaxDurationMinutes.Should().Be(120);
        result.Value.MaxDiscountPercentage.Should().Be(25m);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithValidCategoryAndTags_SetsThemOnTheService()
    {
        var service = ValidService();
        var category = new Category(Guid.NewGuid(), "Hair");
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var handler = CreateHandler(
            out var serviceRepository, out var categoryRepository, out var tagRepository, out var unitOfWork);
        serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, category.Id, [tag.Id]),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CategoryId.Should().Be(category.Id);
        result.Value.CategoryName.Should().Be("Hair");
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithEmptyTagIds_ClearsExistingTags()
    {
        var service = ValidService();
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        service.SetTags([tag]);
        var handler = CreateHandler(
            out var serviceRepository, out _, out var tagRepository, out var unitOfWork);
        serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, []),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().BeEmpty();
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithNullTagIds_LeavesExistingTagsUntouched()
    {
        var service = ValidService();
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        service.SetTags([tag]);
        var handler = CreateHandler(
            out var serviceRepository, out _, out var tagRepository, out var unitOfWork);
        serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
        await tagRepository.DidNotReceive().GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
