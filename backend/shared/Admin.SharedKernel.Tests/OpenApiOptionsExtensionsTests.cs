using System.Text.Json;
using Admin.SharedKernel.AspNetCore;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.OpenApi;

namespace Admin.SharedKernel.Tests;

public class OpenApiOptionsExtensionsTests
{
    [Theory]
    [InlineData(typeof(CpfNumber))]
    [InlineData(typeof(BirthDate))]
    public void MapValueObjectsToStrings_GivesAValueObjectNoSchemaOfItsOwn(Type valueObject)
    {
        var options = new OpenApiOptions().MapValueObjectsToStrings();

        options.CreateSchemaReferenceId(JsonSerializerOptions.Default.GetTypeInfo(valueObject)).Should().BeNull();
    }

    [Theory]
    [InlineData(typeof(Guid))]
    [InlineData(typeof(string))]
    [InlineData(typeof(ApiResponse<string>))]
    public void MapValueObjectsToStrings_KeepsTheDefaultSchemaNameOfEverythingElse(Type type)
    {
        var typeInfo = JsonSerializerOptions.Default.GetTypeInfo(type);
        var options = new OpenApiOptions().MapValueObjectsToStrings();

        options.CreateSchemaReferenceId(typeInfo).Should().Be(OpenApiOptions.CreateDefaultSchemaReferenceId(typeInfo));
    }
}
