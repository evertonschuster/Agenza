using Admin.SharedKernel.AspNetCore;
using System.Text.Json;
using Microsoft.OpenApi;

namespace Admin.SharedKernel.Tests;

public class ObjectValueObjectSchemaTests
{
    public sealed record Note : IObjectValueObject<Note>
    {
        public string Text { get; }
        public string? Author { get; }
        public bool HasAuthor => Author is not null;

        private Note(string text, string? author)
        {
            Text = text;
            Author = author;
        }

        public static ParseResult<Note> Create(string? text, string? author = null) =>
            string.IsNullOrWhiteSpace(text)
                ? ParseResult<Note>.Failure("Informe o texto.")
                : ParseResult<Note>.Success(new Note(text, author));
    }

    public sealed record Person : IObjectValueObject<Person>
    {
        public string FirstName { get; }
        public string? LastName { get; }
        public string FullName => $"{FirstName} {LastName}".Trim();

        private Person(string firstName, string? lastName)
        {
            FirstName = firstName;
            LastName = lastName;
        }

        public static ParseResult<Person> Create(string? firstName, string? lastName = null) =>
            string.IsNullOrWhiteSpace(firstName)
                ? ParseResult<Person>.Failure("Informe o nome.")
                : ParseResult<Person>.Success(new Person(firstName, lastName));
    }

    private static OpenApiSchema SchemaWith(params string[] names) =>
        new()
        {
            Type = JsonSchemaType.Object,
            Properties = names.ToDictionary(name => name, IOpenApiSchema (_) => new OpenApiSchema { Type = JsonSchemaType.String }),
        };

    [Fact]
    public void PartsOf_MarksAPartRequiredUnlessItsCreateParameterHasADefault()
    {
        ObjectValueObjects.PartsOf(typeof(Note)).Should().BeEquivalentTo(
            [new ObjectPart("text", Required: true), new ObjectPart("author", Required: false)]);
    }

    [Fact]
    public void Apply_KeepsOnlyThePartsOfCreate_DroppingWhatTheValueObjectAddsOnItsOwn()
    {
        var schema = SchemaWith("text", "author", "hasAuthor");

        ObjectValueObjectSchema.Apply(schema, typeof(Note));

        schema.Properties!.Keys.Should().BeEquivalentTo("text", "author");
    }

    [Fact]
    public void Apply_RequiresOnlyThePartsWithoutADefault()
    {
        var schema = SchemaWith("text", "author", "hasAuthor");

        ObjectValueObjectSchema.Apply(schema, typeof(Note));

        schema.Required.Should().BeEquivalentTo("text");
    }

    [Fact]
    public void Apply_WithNoRequiredPart_LeavesTheRequiredListOut()
    {
        var schema = SchemaWith("author");

        ObjectValueObjectSchema.Apply(schema, typeof(Note));

        schema.Required.Should().BeNull();
    }

    [Theory]
    [InlineData("SnakeCaseLower", "first_name", "last_name", "full_name")]
    [InlineData("CamelCase", "firstName", "lastName", "fullName")]
    public void Apply_MatchesThePartsByTheirNamesUnderTheNamingPolicy(string policy, string first, string last, string computed)
    {
        var namingPolicy = policy == "SnakeCaseLower" ? JsonNamingPolicy.SnakeCaseLower : JsonNamingPolicy.CamelCase;
        var schema = SchemaWith(first, last, computed);

        ObjectValueObjectSchema.Apply(schema, typeof(Person), namingPolicy);

        schema.Properties!.Keys.Should().BeEquivalentTo(first, last);
        schema.Required.Should().BeEquivalentTo(first);
    }
}
