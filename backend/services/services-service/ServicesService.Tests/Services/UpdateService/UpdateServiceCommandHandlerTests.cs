using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services;
using ServicesService.Application.Services.UpdateService;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services.UpdateService;

public class UpdateServiceCommandHandlerTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<UpdateServiceCommandHandler> _logger =
        Substitute.For<ILogger<UpdateServiceCommandHandler>>();
    private readonly UpdateServiceCommandHandler _handler;

    public UpdateServiceCommandHandlerTests()
    {
        _serviceRepository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        var loader = new ServiceRelationshipLoader(_categoryRepository, _tagRepository);
        _handler = new UpdateServiceCommandHandler(_serviceRepository, loader, _unitOfWork, _logger);
    }

    private static Service ValidService() =>
        new(Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1);

    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var service = ValidService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Massage", "Relaxing", 90, 60, 120, 90.00m, 25m, null, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("Massage");
        result.Value.DurationMinutes.Should().Be(90);
        result.Value.MinDurationMinutes.Should().Be(60);
        result.Value.MaxDurationMinutes.Should().Be(120);
        result.Value.MaxDiscountPercentage.Should().Be(25m);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithValidCategoryAndTags_SetsThemOnTheService()
    {
        var service = ValidService();
        var category = new Category(Guid.NewGuid(), "Hair");
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, category.Id, [tag.Id]),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CategoryId.Should().Be(category.Id);
        result.Value.CategoryName.Should().Be("Hair");
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithEmptyTagIds_ClearsExistingTags()
    {
        var service = ValidService();
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        service.SetTags([tag]);
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, []),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().BeEmpty();
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithNullTagIds_LeavesExistingTagsUntouched()
    {
        var service = ValidService();
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        service.SetTags([tag]);
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
        await _tagRepository.DidNotReceive().GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownServiceId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _serviceRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _handler.Handle(
            new UpdateServiceCommand(unknownId, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Service.NotFound");
    }

    [Fact]
    public async Task Handle_RenamingToAnotherServicesName_ReturnsConflict()
    {
        var service = ValidService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _serviceRepository.NameExistsAsync("Massage", service.Id, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Massage", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateName");
    }

    [Fact]
    public async Task Handle_WithUnknownCategoryId_ReturnsNotFound()
    {
        var service = ValidService();
        var categoryId = Guid.NewGuid();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _categoryRepository.GetByIdAsync(categoryId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, categoryId, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Category.NotFound");
    }

    [Fact]
    public async Task Handle_LoadsTheServiceExactlyOnce()
    {
        var service = ValidService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        await _serviceRepository.Received(1).GetByIdAsync(service.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithConcurrentDuplicateNameAtSaveTime_ReturnsConflict()
    {
        var service = ValidService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<Task<int>>(_ => throw new DuplicateEntityException(
                new InvalidOperationException(), "IX_Services_TenantId_NameNormalized"));

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateName");
    }

    [Fact]
    public async Task Handle_WithConcurrentDuplicateCodeAtSaveTime_ReturnsDuplicateCodeConflict()
    {
        var service = ValidService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<Task<int>>(_ => throw new DuplicateEntityException(
                new InvalidOperationException(), "IX_Services_TenantId_Code"));

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateCode");
    }

    [Fact]
    public async Task Handle_WithUnrecognizedConstraintAtSaveTime_ReturnsGenericConflictNotDuplicateName()
    {
        var service = ValidService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<Task<int>>(_ => throw new DuplicateEntityException(
                new InvalidOperationException(), "some_other_unique_constraint"));

        var result = await _handler.Handle(
            new UpdateServiceCommand(service.Id, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateConflict");
    }
}
