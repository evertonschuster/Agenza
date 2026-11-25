using System.ComponentModel;
using System.Text.Json;
using Admin.SharedKernel.ValueObjects;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Extensions;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;
using Result = Admin.SharedKernel.Result;

namespace ServicesService.McpTests;

public sealed class ValueObjectToolTests
{
    [Fact]
    public void Compatibilidade_de_vos_preserva_o_cadastro_explicito_do_sdk_sem_descobrir_outras_tools()
    {
        var services = new ServiceCollection().AddLogging();
        var jsonOptions = services.AddMcpValueObjectInputs(TimeProvider.System);
        services.AddMcpServer().WithTools<HelloWorldTools>(jsonOptions);
        using var provider = services.BuildServiceProvider();

        _ = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;

        provider.GetServices<McpServerTool>().Should().ContainSingle().Which.ProtocolTool.Name.Should().Be("hello_world");
    }

    [Fact]
    public async Task Command_chega_com_vos_normalizados_sem_conversao_na_tool()
    {
        using var provider = Services();

        var result = await McpToolCall.InvokeAsync(provider, "create_contact", new Dictionary<string, object?>
        {
            ["command"] = new { name = "  Maria Silva  ", email = "  MARIA@EXEMPLO.COM  ", birthDate = "2040-01-01" },
        }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        result.StructuredContent!.Value.GetProperty("name").GetString().Should().Be("Maria Silva");
        result.StructuredContent!.Value.GetProperty("email").GetString().Should().Be("maria@exemplo.com");
        provider.GetRequiredService<RecordingInput>().CommandCalls.Should().Be(1);
    }

    [Theory]
    [InlineData("name", "", "O nome completo é obrigatório.")]
    [InlineData("email", "valor-privado-invalido", "Informe um e-mail válido.")]
    [InlineData("birthDate", "2042-01-01", "A data de nascimento deve estar no passado.")]
    public async Task Vo_invalido_retorna_validacao_por_campo_sem_executar_command(string field, string value, string expectedMessage)
    {
        using var provider = Services();
        var command = new Dictionary<string, object?> { ["name"] = "Maria Silva", ["email"] = "maria@exemplo.com", ["birthDate"] = "2040-01-01" };
        command[field] = value;

        var result = await McpToolCall.InvokeAsync(provider, "create_contact", new Dictionary<string, object?> { ["command"] = command },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        var text = result.Content.OfType<TextContentBlock>().Single().Text;
        using var document = JsonDocument.Parse(text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        var message = error.GetProperty("message").GetString();
        message.Should().StartWith(expectedMessage);
        error.GetProperty("fieldErrors").GetProperty($"command.{field}")[0].GetProperty("message").GetString()
            .Should().Be(message);
        text.Should().NotContain("valor-privado-invalido");
        provider.GetRequiredService<RecordingInput>().CommandCalls.Should().Be(0);
    }

    [Fact]
    public async Task Falha_em_item_da_lista_preserva_o_indice_no_caminho_do_campo()
    {
        using var provider = Services();
        var result = await McpToolCall.InvokeAsync(provider, "probe", new Dictionary<string, object?>
        {
            ["input"] = new
            {
                contact = new { email = "maria@example.com" },
                searches = new[] { "vip", new string('x', SearchText.MaxLength + 1) },
                kind = "vip",
            },
        }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("fieldErrors").TryGetProperty("input.searches[1]", out _).Should().BeTrue();
        provider.GetRequiredService<RecordingInput>().Value.Should().BeNull();
    }

    [Theory]
    [InlineData("kind", "\"inexistente\"", "input.kind: esperado um de: vip.")]
    [InlineData("searches", "[\"vip\", 7]", "input.searches[1]: esperado texto.")]
    [InlineData("contact", "{\"email\": 5}", "input.contact.email: esperado texto.")]
    public async Task Erro_de_tipo_no_binding_informa_o_caminho_completo_e_o_valor_esperado(string field, string json, string expected)
    {
        using var provider = Services();
        var input = new Dictionary<string, object?>
        {
            ["contact"] = new { email = "maria@exemplo.com" },
            ["searches"] = new[] { "vip" },
            ["kind"] = "vip",
        };
        input[field] = JsonDocument.Parse(json).RootElement.Clone();

        var result = await McpToolCall.InvokeAsync(provider, "probe", new Dictionary<string, object?> { ["input"] = input },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        document.RootElement.GetProperty("error").GetProperty("message").GetString().Should().Be(expected);
        provider.GetRequiredService<RecordingInput>().Value.Should().BeNull();
    }

    [Fact]
    public async Task Registro_compartilha_conversores_para_objetos_aninhados_listas_enums_e_datas_com_relogio_injetado()
    {
        using var provider = Services();
        using var scope = provider.CreateScope();

        var result = await McpToolCall.InvokeAsync(scope.ServiceProvider, "probe", new Dictionary<string, object?>
        {
            ["input"] = new { contact = new { email = "  MARIA@EXEMPLO.COM  ", birthDate = "2040-01-01" }, searches = new[] { "  VIP  " }, kind = "vip" },
        }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        var received = provider.GetRequiredService<RecordingInput>().Value!;
        received.Contact.Email.Value.Should().Be("maria@exemplo.com");
        received.Contact.BirthDate!.Value.Should().Be(new DateOnly(2040, 1, 1));
        received.Searches.Single().Value.Should().Be("vip");
        received.Kind.Should().Be(Kind.Vip);
    }

    [Fact]
    public void Schema_preserva_nulabilidade_descricoes_e_formato_de_vos_aninhados_e_em_listas()
    {
        using var provider = Services();
        var tool = provider.GetServices<McpServerTool>().Single(tool => tool.ProtocolTool.Name == "probe");
        var properties = tool.ProtocolTool.InputSchema.GetProperty("properties").GetProperty("input").GetProperty("properties");
        var contact = properties.GetProperty("contact").GetProperty("properties");

        contact.GetProperty("email").GetProperty("type").GetString().Should().Be("string");
        contact.GetProperty("email").GetProperty("description").GetString().Should().Be("E-mail do contato.");
        contact.GetProperty("birthDate").GetProperty("type").EnumerateArray().Select(item => item.GetString())
            .Should().BeEquivalentTo("string", "null");
        contact.GetProperty("birthDate").GetProperty("format").GetString().Should().Be("date");
        var items = properties.GetProperty("searches").GetProperty("items");
        items.GetProperty("type").GetString().Should().Be("string");
        items.TryGetProperty("properties", out _).Should().BeFalse();
        var outputContact = tool.ProtocolTool.OutputSchema!.Value.GetProperty("properties").GetProperty("contact").GetProperty("properties");
        outputContact.GetProperty("email").GetProperty("type").GetString().Should().Be("string");
    }

    [Fact]
    public void Schema_preserva_elementos_opcionais_em_listas_e_valores_de_dicionarios()
    {
        using var provider = Services();
        var tool = provider.GetServices<McpServerTool>().Single(tool => tool.ProtocolTool.Name == "collections");
        var properties = tool.ProtocolTool.InputSchema.GetProperty("properties").GetProperty("input").GetProperty("properties");

        properties.GetProperty("searches").GetProperty("items").GetProperty("type").EnumerateArray().Select(item => item.GetString())
            .Should().BeEquivalentTo("string", "null");
        properties.GetProperty("emails").GetProperty("additionalProperties").GetProperty("type").GetString().Should().Be("string");
    }

    [Fact]
    public async Task Configuracao_de_input_compartilha_conversores_entre_classes_de_ferramentas()
    {
        using var provider = Services();

        var result = await McpToolCall.InvokeAsync(provider, "collections", new Dictionary<string, object?>
        {
            ["input"] = new { searches = new string?[] { "  VIP  ", null }, emails = new { owner = "  MARIA@EXEMPLO.COM  " } },
        }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        var content = result.StructuredContent!.Value;
        content.GetProperty("searches")[0].GetString().Should().Be("vip");
        content.GetProperty("searches")[1].ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        content.GetProperty("emails").GetProperty("owner").GetString().Should().Be("maria@exemplo.com");
    }

    private static ServiceProvider Services()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSingleton<RecordingInput>();
        var jsonOptions = services.AddMcpValueObjectInputs(new FixedClock());
        services.AddMcpServer().WithToolExceptionHandling().WithTools([typeof(ProbeTools), typeof(CollectionTools)], jsonOptions);
        var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _ = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;
        return provider;
    }

    [McpServerToolType]
    public sealed class ProbeTools(RecordingInput recording)
    {
        [McpServerTool(Name = "create_contact", UseStructuredContent = true, OutputSchemaType = typeof(CommandInput))]
        public CallToolResult CreateContact(CommandInput command)
        {
            recording.CommandCalls++;
            return Result.Success(command).ToToolResult();
        }

        [McpServerTool(Name = "probe", UseStructuredContent = true, OutputSchemaType = typeof(Input))]
        public CallToolResult Probe(Input input)
        {
            recording.Value = input;
            return Result.Success(input).ToToolResult();
        }
    }

    public sealed class RecordingInput
    {
        public Input? Value { get; set; }

        public int CommandCalls { get; set; }
    }

    public sealed record CommandInput(FullName Name, EmailAddress Email, BirthDate? BirthDate);

    public sealed record Input(Contact Contact, IReadOnlyList<SearchText> Searches, Kind Kind);

    public sealed record Contact([property: Description("E-mail do contato.")] EmailAddress Email, BirthDate? BirthDate);

    [McpServerToolType]
    public sealed class CollectionTools
    {
        [McpServerTool(Name = "collections", UseStructuredContent = true, OutputSchemaType = typeof(CollectionInput))]
        public static CallToolResult Collections(CollectionInput input) => Result.Success(input).ToToolResult();
    }

    public sealed record CollectionInput(IReadOnlyList<SearchText?> Searches, IReadOnlyDictionary<string, EmailAddress> Emails);

    public enum Kind { Vip }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2041, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }
}
