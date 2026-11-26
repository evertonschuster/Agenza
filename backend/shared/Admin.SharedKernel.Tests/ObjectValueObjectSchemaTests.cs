using Admin.SharedKernel.AspNetCore;
using Microsoft.OpenApi;

namespace Admin.SharedKernel.Tests;

public class ObjectValueObjectSchemaTests
{
    public sealed record NoteInput(string? Text, string? Author = null);

    public sealed record Note : IObjectValueObject<Note, NoteInput>
    {
        public string Text { get; }
        public string? Author { get; }
        public bool HasAuthor => Author is not null;

        private Note(string text, string? author)
        {
            Text = text;
            Author = author;
        }

        public static ParseResult<Note> Create(NoteInput input) =>
            string.IsNullOrWhiteSpace(input.Text)
                ? ParseResult<Note>.Failure("Informe o texto.")
                : ParseResult<Note>.Success(new Note(input.Text, input.Author));

        public static NoteInput ToInput(Note value) => new(value.Text, value.Author);
    }

    private static OpenApiSchema SchemaWith(params string[] names) =>
        new()
        {
            Type = JsonSchemaType.Object,
            Properties = names.ToDictionary(name => name, IOpenApiSchema (_) => new OpenApiSchema { Type = JsonSchemaType.String }),
        };

    [Fact]
    public void PartsOf_MarksAPartRequiredUnlessItsConstructorParameterHasADefault()
    {
        ObjectValueObjects.PartsOf(typeof(Note)).Should().BeEquivalentTo(
            [new ObjectPart("Text", Required: true), new ObjectPart("Author", Required: false)]);
    }

    [Fact]
    public void Apply_KeepsOnlyThePartsOfTheInput_DroppingWhatTheValueObjectAddsOnItsOwn()
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
}
