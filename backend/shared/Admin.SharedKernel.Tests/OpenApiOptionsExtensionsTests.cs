using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.OpenApi;
using System.Text.Json;

namespace Admin.SharedKernel.Tests;

public class OpenApiOptionsExtensionsTests
{
    [Theory]
    [InlineData(typeof(CpfNumber))]
    [InlineData(typeof(BirthDate))]
    public void MapValueObjects_GivesAValueObjectNoSchemaOfItsOwn(Type valueObject)
    {
        var options = new OpenApiOptions().MapValueObjects();

        options.CreateSchemaReferenceId(JsonSerializerOptions.Default.GetTypeInfo(valueObject)).Should().BeNull();
    }

    [Fact]
    public void MapValueObjects_KeepsTheSchemaOfAnObjectValueObject()
    {
        var typeInfo = JsonSerializerOptions.Default.GetTypeInfo(typeof(Pair));
        var options = new OpenApiOptions().MapValueObjects();

        options.CreateSchemaReferenceId(typeInfo).Should().Be(OpenApiOptions.CreateDefaultSchemaReferenceId(typeInfo));
    }

    public sealed record PairInput(int? Left, int? Right);

    public sealed record Pair : IObjectValueObject<Pair, PairInput>
    {
        public int Left { get; }
        public int Right { get; }

        private Pair(int left, int right)
        {
            Left = left;
            Right = right;
        }

        public static ParseResult<Pair> Create(PairInput input) =>
            ParseResult<Pair>.Success(new Pair(input.Left ?? 0, input.Right ?? 0));

        public static PairInput ToInput(Pair value) => new(value.Left, value.Right);
    }

    [Theory]
    [InlineData(typeof(Guid))]
    [InlineData(typeof(string))]
    [InlineData(typeof(ApiResponse<string>))]
    public void MapValueObjects_KeepsTheDefaultSchemaNameOfEverythingElse(Type type)
    {
        var typeInfo = JsonSerializerOptions.Default.GetTypeInfo(type);
        var options = new OpenApiOptions().MapValueObjects();

        options.CreateSchemaReferenceId(typeInfo).Should().Be(OpenApiOptions.CreateDefaultSchemaReferenceId(typeInfo));
    }
}
