using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services;

public class ServiceRelationshipLoaderTests
{
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly ServiceRelationshipLoader _loader;

    public ServiceRelationshipLoaderTests()
    {
        _loader = new ServiceRelationshipLoader(_categoryRepository, _tagRepository);
    }

    [Fact]
    public async Task LoadAsync_WithNoCategoryOrTags_ReturnsEmptyRelationshipsWithoutQuerying()
    {
        var result = await _loader.LoadAsync(categoryId: null, tagIds: null, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Category.Should().BeNull();
        result.Value.Tags.Should().BeEmpty();
        await _categoryRepository.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await _tagRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoadAsync_WithKnownCategory_ReturnsIt()
    {
        var category = new Category(Guid.NewGuid(), "Hair");
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        var result = await _loader.LoadAsync(category.Id, tagIds: null, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Category.Should().Be(category);
    }

    [Fact]
    public async Task LoadAsync_WithUnknownCategory_ReturnsNotFound()
    {
        var categoryId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(categoryId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _loader.LoadAsync(categoryId, tagIds: null, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Category.NotFound");
    }

    [Fact]
    public async Task LoadAsync_WithKnownTags_ReturnsThem()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await _loader.LoadAsync(categoryId: null, tagIds: [tag.Id], CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
    }

    [Fact]
    public async Task LoadAsync_WithUnknownTag_ReturnsNotFound()
    {
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await _loader.LoadAsync(categoryId: null, tagIds: [Guid.NewGuid()], CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
    }

    [Fact]
    public async Task LoadAsync_WithEmptyTagIds_DoesNotQueryTags()
    {
        var result = await _loader.LoadAsync(categoryId: null, tagIds: [], CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().BeEmpty();
        await _tagRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoadAsync_WithMultipleDistinctKnownTags_ReturnsAllOfThem()
    {
        var first = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var second = new Tag(Guid.NewGuid(), "Returning", TagColor.From("#ef4444"), null);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { first, second });

        var result = await _loader.LoadAsync(categoryId: null, tagIds: [first.Id, second.Id], CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().HaveCount(2);
    }

    [Fact]
    public async Task LoadAsync_WithADuplicatedKnownTagId_SucceedsInsteadOfMisreportingNotFound()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        // GetByIdsAsync returns one row per distinct id even when the caller
        // passes the same id twice - the loader must compare against the
        // distinct count, not the raw list length.
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await _loader.LoadAsync(categoryId: null, tagIds: [tag.Id, tag.Id], CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
    }

    [Fact]
    public async Task LoadAsync_WithADuplicatedIdAndAnUnknownId_StillReturnsTagNotFound()
    {
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var unknownId = Guid.NewGuid();
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await _loader.LoadAsync(
            categoryId: null, tagIds: [tag.Id, tag.Id, unknownId], CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
    }
}
