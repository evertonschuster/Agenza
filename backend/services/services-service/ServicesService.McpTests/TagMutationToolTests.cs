using System.Text.Json;
using System.Text.RegularExpressions;
using Admin.SharedKernel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using NSubstitute;
using ServicesService.Application;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;

namespace ServicesService.McpTests;

public sealed class TagMutationToolTests
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

    [Fact]
    public void Edicao_publica_campos_finais_obrigatorios_com_descricao_anulavel()
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>()
            .Single(tool => tool.ProtocolTool.Name == "update_tag").ProtocolTool;

        tool.Title.Should().Be("Editar etiqueta");
        tool.Description.Should().Contain("get_tag_by_id").And.Contain("list_tags");
        tool.Annotations!.ReadOnlyHint.Should().BeFalse();
        tool.Annotations.DestructiveHint.Should().BeTrue();
        tool.InputSchema.GetProperty("required").EnumerateArray()
            .Select(item => item.GetString()).Should().Equal("command");
        var command = tool.InputSchema.GetProperty("properties").GetProperty("command");
        command.GetProperty("required").EnumerateArray().Select(item => item.GetString())
            .Should().BeEquivalentTo("tagId", "name", "color", "description");
        var fields = command.GetProperty("properties");
        fields.EnumerateObject().Select(property => property.Name)
            .Should().BeEquivalentTo("tagId", "name", "color", "description");
        fields.GetProperty("tagId").GetProperty("format").GetString().Should().Be("uuid");
        var colorDescription = fields.GetProperty("color").GetProperty("description").GetString();
        Regex.Matches(colorDescription!, "#[0-9a-f]{6}").Select(match => match.Value)
            .Should().BeEquivalentTo(TagColor.Palette);
        fields.GetProperty("description").GetProperty("type").EnumerateArray().Select(item => item.GetString())
            .Should().BeEquivalentTo("string", "null");
        tool.OutputSchema!.Value.GetProperty("properties").EnumerateObject()
            .Select(property => property.Name).Should().BeEquivalentTo("id", "name", "color", "description");
    }

    [Theory]
    [InlineData("VIP", "Cliente recorrente")]
    [InlineData("Agenda VIP", "Descrição atualizada")]
    [InlineData("VIP", null)]
    public async Task Edicao_salva_os_valores_finais_e_retorna_a_etiqueta_com_o_mesmo_id(string name, string? description)
    {
        var tag = CreateExistingTag();
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));

        var result = await Invoke(new { tagId = tag.Id, name, color = "#22C55E", description }, "update_tag");

        result.IsError.Should().BeFalse();
        var updated = result.StructuredContent!.Value;
        updated.GetProperty("id").GetGuid().Should().Be(tag.Id);
        updated.GetProperty("name").GetString().Should().Be(name);
        updated.GetProperty("color").GetString().Should().Be("#22c55e");
        updated.GetProperty("description").GetString().Should().Be(description);
        tag.Name.Should().Be(name);
        tag.Color.Value.Should().Be("#22c55e");
        tag.Description.Should().Be(description);
        await _repository.Received(1).NameExistsAsync(name, tag.Id, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public Task Omitir_descricao_na_edicao_retorna_validacao_antes_da_gravacao() =>
        AssertValidationFailure(new { tagId = Guid.NewGuid(), name = "VIP", color = "#22c55e" }, "description", "update_tag");

    [Theory]
    [InlineData("", "#22c55e", "O nome da etiqueta é obrigatório.")]
    [InlineData("VIP", "#ffffff", "A cor da etiqueta deve ser uma das seguintes")]
    [InlineData("VIP", null, "A cor da etiqueta é obrigatória.")]
    public Task Edicao_com_valores_invalidos_nao_consulta_nem_grava(string name, string? color, string message) =>
        AssertValidationFailure(new { tagId = Guid.NewGuid(), name, color, description = "Cliente recorrente" }, message, "update_tag");

    [Fact]
    public async Task Edicao_com_nome_duplicado_retorna_conflito_e_preserva_a_etiqueta()
    {
        var tag = CreateExistingTag();
        _repository.NameExistsAsync("Nome ocupado", tag.Id, Arg.Any<CancellationToken>()).Returns(true);

        var result = await Invoke(new { tagId = tag.Id, name = "Nome ocupado", color = "#22c55e", description = (string?)null },
            "update_tag");

        result.IsError.Should().BeTrue();
        using var document = ParseError(result);
        document.RootElement.GetProperty("error").GetProperty("code").GetString().Should().Be("Tag.DuplicateName");
        tag.Name.Should().Be("VIP");
        tag.Color.Value.Should().Be("#0d9488");
        tag.Description.Should().Be("Cliente recorrente");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Edicao_de_etiqueta_indisponivel_retorna_nao_encontrado_sem_gravar()
    {
        var result = await Invoke(new { tagId = Guid.NewGuid(), name = "VIP", color = "#22c55e", description = (string?)null },
            "update_tag");

        result.IsError.Should().BeTrue();
        using var document = ParseError(result);
        document.RootElement.GetProperty("error").GetProperty("code").GetString().Should().Be("Tag.NotFound");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    private Tag CreateExistingTag()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, "Cliente recorrente").Value;
        _repository.GetForUpdateAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        return tag;
    }

    private async Task AssertValidationFailure(object command, string message, string toolName = "create_tag")
    {
        var result = await Invoke(command, toolName);

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

    private async Task<CallToolResult> Invoke(object command, string toolName = "create_tag")
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var argument = JsonSerializer.SerializeToElement(command, JsonSerializerOptions.Web);
        return await McpToolCall.InvokeAsync(scope.ServiceProvider, toolName,
            new Dictionary<string, object?> { ["command"] = argument }, TestContext.Current.CancellationToken);
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
