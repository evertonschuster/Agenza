using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.CreateTag;

namespace ServicesService.Tests.Tags.CreateTag;

public class CreateTagCommandValidatorTests
{
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly CreateTagCommandValidator _validator;

    public CreateTagCommandValidatorTests()
    {
        _tagRepository.NameExistsAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _validator = new CreateTagCommandValidator(_tagRepository);
    }

    [Fact]
    public async Task Validate_WithValidCommand_Passes()
    {
        var result = await _validator.ValidateAsync(new CreateTagCommand("VIP", "#0d9488", "Note"));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithEmptyName_Fails()
    {
        var result = await _validator.ValidateAsync(new CreateTagCommand("", "#0d9488", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithNameOverMaxLength_Fails()
    {
        var name = new string('x', 41);

        var result = await _validator.ValidateAsync(new CreateTagCommand(name, "#0d9488", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithColorOutsidePalette_Fails()
    {
        var result = await _validator.ValidateAsync(new CreateTagCommand("VIP", "#123456", null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDescriptionOverMaxLength_Fails()
    {
        var description = new string('x', 201);

        var result = await _validator.ValidateAsync(new CreateTagCommand("VIP", "#0d9488", description));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task Validate_WithDuplicateName_FailsWithDuplicateNameErrorCode()
    {
        _tagRepository.NameExistsAsync("VIP", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _validator.ValidateAsync(new CreateTagCommand("VIP", "#0d9488", null));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Tag.DuplicateName");
    }
}
