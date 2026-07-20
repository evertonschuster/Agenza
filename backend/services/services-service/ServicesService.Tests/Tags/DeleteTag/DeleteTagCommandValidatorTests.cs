using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.DeleteTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.DeleteTag;

public class DeleteTagCommandValidatorTests
{
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly DeleteTagCommandValidator _validator;
    private readonly Guid _tagId = Guid.NewGuid();

    public DeleteTagCommandValidatorTests()
    {
        var tag = new Tag(_tagId, "VIP", TagColor.From("#0d9488"), null);
        _tagRepository.GetByIdAsync(_tagId, Arg.Any<CancellationToken>()).Returns(tag);
        _validator = new DeleteTagCommandValidator(_tagRepository);
    }

    [Fact]
    public async Task Validate_WithExistingTag_Passes()
    {
        var result = await _validator.ValidateAsync(new DeleteTagCommand(_tagId));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithUnknownTagId_FailsWithNotFoundErrorCode()
    {
        var unknownId = Guid.NewGuid();
        _tagRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Tag?)null);

        var result = await _validator.ValidateAsync(new DeleteTagCommand(unknownId));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Tag.NotFound");
    }
}
