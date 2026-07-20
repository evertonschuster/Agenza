using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.UpdateService;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services.UpdateService;

public class UpdateServiceCommandValidatorTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly UpdateServiceCommandValidator _validator;
    private readonly Guid _serviceId = Guid.NewGuid();

    public UpdateServiceCommandValidatorTests()
    {
        var service = new Service(_serviceId, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1);
        _serviceRepository.GetByIdAsync(_serviceId, Arg.Any<CancellationToken>()).Returns(service);
        _serviceRepository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _categoryRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => new Category(callInfo.ArgAt<Guid>(0), "Hair"));
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.ArgAt<IReadOnlyCollection<Guid>>(0)
                .Select(id => new Tag(id, "VIP", TagColor.From("#0d9488"), null))
                .ToList());
        _validator = new UpdateServiceCommandValidator(_serviceRepository, _categoryRepository, _tagRepository);
    }

    private UpdateServiceCommand ValidCommand() =>
        new(_serviceId, "Haircut", "Note", 30, 15, 60, 45.50m, 10m, null, null);

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        (await _validator.ValidateAsync(ValidCommand())).IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyServiceId_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { ServiceId = Guid.Empty })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Name = "" })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMinDurationGreaterThanMaxDuration_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MinDurationMinutes = 61, MaxDurationMinutes = 60 }))
            .IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDurationOutsideMinMaxRange_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { DurationMinutes = 5 })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNegativePrice_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { Price = -0.01m })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithMaxDiscountPercentageOutsideRange_Fails()
    {
        (await _validator.ValidateAsync(ValidCommand() with { MaxDiscountPercentage = 100.01m })).IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithUnknownServiceId_FailsWithNotFoundErrorCode()
    {
        var unknownId = Guid.NewGuid();
        _serviceRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _validator.ValidateAsync(ValidCommand() with { ServiceId = unknownId });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Service.NotFound");
    }

    [Fact]
    public async Task Validate_RenamingToAnotherServicesName_FailsWithDuplicateNameErrorCode()
    {
        _serviceRepository.NameExistsAsync("Massage", _serviceId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _validator.ValidateAsync(ValidCommand() with { Name = "Massage" });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Service.DuplicateName");
    }

    [Fact]
    public async Task Validate_WithUnknownCategoryId_FailsWithNotFoundErrorCode()
    {
        var categoryId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(categoryId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _validator.ValidateAsync(ValidCommand() with { CategoryId = categoryId });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Category.NotFound");
    }

    [Fact]
    public async Task Validate_WithUnknownTagId_FailsWithNotFoundErrorCode()
    {
        var tagId = Guid.NewGuid();
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await _validator.ValidateAsync(ValidCommand() with { TagIds = [tagId] });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Tag.NotFound");
    }

    [Fact]
    public async Task Validate_WithEmptyTagIds_Passes()
    {
        var result = await _validator.ValidateAsync(ValidCommand() with { TagIds = [] });

        result.IsValid.Should().BeTrue();
        await _tagRepository.Received(1)
            .GetByIdsAsync(Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 0), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Validate_WithNullTagIds_DoesNotCheckTagExistence()
    {
        var result = await _validator.ValidateAsync(ValidCommand() with { TagIds = null });

        result.IsValid.Should().BeTrue();
        await _tagRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }
}
