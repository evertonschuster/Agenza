using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services;
using ServicesService.Application.Services.CreateService;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services.CreateService;

public class CreateServiceCommandHandlerTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly IServiceCodeGenerator _serviceCodeGenerator = Substitute.For<IServiceCodeGenerator>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<CreateServiceCommandHandler> _logger =
        Substitute.For<ILogger<CreateServiceCommandHandler>>();
    private readonly CreateServiceCommandHandler _handler;

    public CreateServiceCommandHandlerTests()
    {
        _serviceRepository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _serviceCodeGenerator.GetNextCodeAsync(Arg.Any<CancellationToken>()).Returns(1);
        var loader = new ServiceRelationshipLoader(_categoryRepository, _tagRepository);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new CreateServiceCommandHandler(
            _serviceRepository, loader, _serviceCodeGenerator, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheService()
    {
        var result = await _handler.Handle(
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
        await _serviceCodeGenerator.Received(1).GetNextCodeAsync(Arg.Any<CancellationToken>());
        _serviceRepository.Received(1).Add(Arg.Is<Service>(s => s.Id == result.Value.Id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithValidCategoryAndTags_SetsThemOnTheService()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await _handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, category.Id, [tag.Id]),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CategoryId.Should().Be(category.Id);
        result.Value.CategoryName.Should().Be("Hair");
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDuplicateName_ReturnsConflictAndDoesNotGenerateACode()
    {
        _serviceRepository.NameExistsAsync("Haircut", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateName");
        await _serviceCodeGenerator.DidNotReceive().GetNextCodeAsync(Arg.Any<CancellationToken>());
        _serviceRepository.DidNotReceive().Add(Arg.Any<Service>());
    }

    [Fact]
    public async Task Handle_WithUnknownCategoryId_ReturnsNotFoundAndDoesNotGenerateACode()
    {
        var categoryId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(categoryId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, categoryId, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Category.NotFound");
        await _serviceCodeGenerator.DidNotReceive().GetNextCodeAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await _handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, null, [Guid.NewGuid()]),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
    }

    [Fact]
    public async Task Handle_WithValidCategory_LoadsItExactlyOnce()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        await _handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, category.Id, null),
            CancellationToken.None);

        await _categoryRepository.Received(1).GetByIdAsync(category.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithConcurrentDuplicateNameAtSaveTime_ReturnsConflict()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Services_TenantId_NameNormalized")));

        var result = await _handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateName");
    }

    [Fact]
    public async Task Handle_WithConcurrentDuplicateCodeAtSaveTime_ReturnsDuplicateCodeConflict()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "IX_Services_TenantId_Code")));

        var result = await _handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateCode");
    }

    [Fact]
    public async Task Handle_WithUnrecognizedConstraintAtSaveTime_ReturnsGenericConflictNotDuplicateName()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_other_unique_constraint")));

        var result = await _handler.Handle(
            new CreateServiceCommand("Haircut", null, 30, 15, 60, 45.50m, 10m, null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateConflict");
    }
}
