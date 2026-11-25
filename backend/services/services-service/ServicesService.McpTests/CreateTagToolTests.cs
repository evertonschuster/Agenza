using System.Text.Json;
using Admin.SharedKernel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using NSubstitute;
using ServicesService.Application;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;

namespace ServicesService.McpTests;

public sealed class CreateTagToolTests
{
    private readonly ITagRepository _repository = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    [Fact]
    public void Publica_contrato_de_criacao_sem_parametros_de_empresa_ou_usuario()
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>()
            .Single(tool => tool.ProtocolTool.Name == "create_tag").ProtocolTool;

        tool.Title.Should().Be("Criar etiqueta");
        tool.Annotations!.ReadOnlyHint.Should().BeFalse();
        tool.Annotations.DestructiveHint.Should().BeFalse();
        tool.Annotations.IdempotentHint.Should().BeFalse();
        tool.Annotations.OpenWorldHint.Should().BeFalse();
        tool.InputSchema.GetProperty("required").EnumerateArray()
            .Select(item => item.GetString()).Should().Equal("command");
        var command = tool.InputSchema.GetProperty("properties").GetProperty("command");
        var fields = command.GetProperty("properties");
        fields.EnumerateObject().Select(property => property.Name)
            .Should().BeEquivalentTo("name", "color", "description");
        command.GetProperty("required").EnumerateArray()
            .Select(item => item.GetString()).Should().BeEquivalentTo("name", "color");
        fields.GetProperty("name").GetProperty("description").GetString().Should().Contain("Nome da etiqueta");
        fields.GetProperty("color").GetProperty("description").GetString().Should().Contain("paleta do Agenza");
        fields.GetProperty("description").GetProperty("description").GetString().Should().Contain("Descrição opcional");
        tool.OutputSchema!.Value.GetProperty("properties").EnumerateObject()
            .Select(property => property.Name).Should().BeEquivalentTo("id", "name", "color", "description");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Cliente recorrente")]
    public async Task Cria_etiqueta_e_retorna_dados_estruturados_com_ou_sem_descricao(string? description)
    {
        var command = new Dictionary<string, object?> { ["name"] = "VIP", ["color"] = "#0D9488" };
        if (description is not null)
        {
            command["description"] = description;
        }
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));

        var result = await Invoke(command);

        result.IsError.Should().BeFalse();
        var tag = result.StructuredContent!.Value;
        var id = tag.GetProperty("id").GetGuid();
        tag.GetProperty("name").GetString().Should().Be("VIP");
        tag.GetProperty("color").GetString().Should().Be("#0d9488");
        tag.GetProperty("description").GetString().Should().Be(description);
        _repository.Received(1).Add(Arg.Is<Tag>(entity => entity.Id == id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("""{"color":"#0d9488"}""", "O nome da etiqueta é obrigatório.")]
    [InlineData("""{"name":"VIP"}""", "A cor da etiqueta é obrigatória.")]
    [InlineData("""{"name":"VIP","color":null}""", "A cor da etiqueta é obrigatória.")]
    [InlineData("""{"name":"VIP","color":"#ffffff"}""", "A cor da etiqueta deve ser uma das seguintes")]
    [InlineData("""{"name":"VIP","color":123}""", "command.color")]
    public async Task Entrada_invalida_retorna_validacao_e_impede_gravacao(string json, string message)
    {
        using var command = JsonDocument.Parse(json);

        await AssertValidationFailure(command.RootElement, message);
    }

    [Fact]
    public Task Descricao_acima_do_limite_impede_gravacao() => AssertValidationFailure(
        new { name = "VIP", color = "#0d9488", description = new string('a', Tag.DescriptionMaxLength + 1) },
        $"A descrição da etiqueta deve ter no máximo {Tag.DescriptionMaxLength} caracteres.");

    [Fact]
    public async Task Nome_ja_usado_retorna_conflito_sem_gravar_outra_etiqueta()
    {
        _repository.NameExistsAsync("VIP", null, Arg.Any<CancellationToken>()).Returns(true);

        var result = await Invoke(new { name = "VIP", color = "#0d9488" });

        result.IsError.Should().BeTrue();
        using var document = ParseError(result);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Tag.DuplicateName");
        error.GetProperty("message").GetString().Should().Be("Já existe uma etiqueta chamada 'VIP'.");
        _repository.DidNotReceive().Add(Arg.Any<Tag>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    private async Task AssertValidationFailure(object command, string message)
    {
        var result = await Invoke(command);

        result.IsError.Should().BeTrue();
        using var document = ParseError(result);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain(message);
        _repository.ReceivedCalls().Should().BeEmpty();
        _unitOfWork.ReceivedCalls().Should().BeEmpty();
    }

    private static JsonDocument ParseError(CallToolResult result) =>
        JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);

    private async Task<CallToolResult> Invoke(object command)
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        return await McpToolCall.InvokeAsync(scope.ServiceProvider, "create_tag",
            new Dictionary<string, object?> { ["command"] = command }, TestContext.Current.CancellationToken);
    }

    private ServiceProvider Services()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSharedKernel();
        services.AddServicesApplication();
        services.AddAuthorization();
        services.AddSingleton(_repository);
        services.AddSingleton(_unitOfWork);
        var jsonOptions = services.AddMcpValueObjectInputs(TimeProvider.System);
        services.AddMcpServer().WithToolExceptionHandling().WithTools<TagsTools>(jsonOptions);
        var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _ = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;
        return provider;
    }
}
