using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.GetTagById;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.GetTagById;

public class GetTagByIdQueryHandlerTests
{
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly GetTagByIdQueryHandler _handler;

    public GetTagByIdQueryHandlerTests()
    {
        _handler = new GetTagByIdQueryHandler(_tagRepository);
    }

    [Fact]
    public async Task Handle_WithExistingTag_ReturnsIt()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, "Clientes premium").Value;
        _tagRepository.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);

        var result = await _handler.Handle(new GetTagByIdQuery(tag.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(tag.Id);
        result.Value.Name.Should().Be(tag.Name);
        result.Value.Color.Should().Be(tag.Color.Value);
        result.Value.Description.Should().Be(tag.Description);
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _tagRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Tag?)null);

        var result = await _handler.Handle(new GetTagByIdQuery(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
    }
}
