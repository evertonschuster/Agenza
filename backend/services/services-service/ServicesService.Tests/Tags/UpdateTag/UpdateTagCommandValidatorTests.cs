using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.UpdateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.UpdateTag;

public class UpdateTagCommandValidatorTests
{
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly UpdateTagCommandValidator _validator;
    private readonly Guid _tagId = Guid.NewGuid();

    public UpdateTagCommandValidatorTests()
    {
        var tag = new Tag(_tagId, "VIP", TagColor.From("#0d9488"), null);
        _tagRepository.GetByIdAsync(_tagId, Arg.Any<CancellationToken>()).Returns(tag);
        _tagRepository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _validator = new UpdateTagCommandValidator(_tagRepository);
    }

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        var result = await _validator.ValidateAsync(new UpdateTagCommand(_tagId, "Returning", "#0d9488", null));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyTagId_Fails()
    {
        var result = await _validator.ValidateAsync(new UpdateTagCommand(Guid.Empty, "VIP", "#0d9488", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        var result = await _validator.ValidateAsync(new UpdateTagCommand(_tagId, "", "#0d9488", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithColorOutsidePalette_Fails()
    {
        var result = await _validator.ValidateAsync(new UpdateTagCommand(_tagId, "VIP", "#123456", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithUnknownTagId_FailsWithNotFoundErrorCode()
    {
        var unknownId = Guid.NewGuid();
        _tagRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Tag?)null);

        var result = await _validator.ValidateAsync(new UpdateTagCommand(unknownId, "VIP", "#0d9488", null));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Tag.NotFound");
    }

    [Fact]
    public async Task Validate_RenamingToItsOwnCurrentName_Passes()
    {
        _tagRepository.NameExistsAsync("VIP", _tagId, Arg.Any<CancellationToken>()).Returns(false);

        var result = await _validator.ValidateAsync(new UpdateTagCommand(_tagId, "VIP", "#0d9488", null));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_RenamingToAnotherTagsName_FailsWithDuplicateNameErrorCode()
    {
        _tagRepository.NameExistsAsync("Returning", _tagId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _validator.ValidateAsync(new UpdateTagCommand(_tagId, "Returning", "#0d9488", null));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Tag.DuplicateName");
    }
}
