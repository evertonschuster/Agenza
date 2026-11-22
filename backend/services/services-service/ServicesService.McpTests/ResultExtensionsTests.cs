using System.Text.Json;
using Admin.SharedKernel;
using ModelContextProtocol.Protocol;
using ServicesService.Mcp.Extensions;
using Result = Admin.SharedKernel.Result;

namespace ServicesService.McpTests;

public sealed class ResultExtensionsTests
{
    [Fact]
    public void Falha_de_validacao_preserva_codigo_categoria_e_detalhes_por_campo()
    {
        var error = Error.Validation("Validation.Failed", "Verifique os campos informados.",
            new Dictionary<string, IReadOnlyList<FieldError>>
            {
                ["email"] = [new FieldError("Email.Invalid", "Informe um e-mail válido.")],
            });

        var result = Result.Failure<object>(error).ToToolResult();

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject;
        using var json = JsonDocument.Parse(text.Text);
        var details = json.RootElement.GetProperty("error");
        details.GetProperty("code").GetString().Should().Be(error.Code);
        details.GetProperty("message").GetString().Should().Be(error.Message);
        details.GetProperty("type").GetString().Should().Be("Validation");
        var field = details.GetProperty("fieldErrors").GetProperty("email")[0];
        field.GetProperty("code").GetString().Should().Be("Email.Invalid");
        field.GetProperty("message").GetString().Should().Be("Informe um e-mail válido.");
    }

    [Theory]
    [InlineData(ErrorType.Failure)]
    [InlineData(ErrorType.NotFound)]
    [InlineData(ErrorType.Conflict)]
    [InlineData(ErrorType.Forbidden)]
    public void Falha_sem_campos_preserva_categoria_sem_inventar_detalhes(ErrorType type)
    {
        var error = new Error("Operation.Failed", "Não foi possível concluir a operação.", type);

        var result = Result.Failure<object>(error).ToToolResult();

        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject;
        using var json = JsonDocument.Parse(text.Text);
        var details = json.RootElement.GetProperty("error");
        details.GetProperty("type").GetString().Should().Be(type.ToString());
        if (details.TryGetProperty("fieldErrors", out var fieldErrors))
        {
            fieldErrors.ValueKind.Should().Be(JsonValueKind.Null);
        }
    }
}
