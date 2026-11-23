using System.ComponentModel;
using System.Globalization;
using System.Text.Json;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Setup;

namespace ServicesService.McpTests;

public sealed class ValueObjectToolTests
{
    [Theory]
    [InlineData("{\"email\":\"  MARIA@EXEMPLO.COM  \"}", "maria@exemplo.com")]
    [InlineData("{\"email\":\"  \"}", "ausente")]
    [InlineData("{\"email\":null}", "ausente")]
    [InlineData("{}", "ausente")]
    public async Task Outro_vo_de_texto_reutiliza_normalizacao_e_ausencia_do_conversor(string arguments, string expected)
    {
        using var provider = Services();

        var result = await Invoke(provider, "email", arguments, TestContext.Current.CancellationToken);

        result.IsError.Should().NotBeTrue();
        result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>()
            .Which.Text.Should().Be(expected);
    }

    [Theory]
    [InlineData("email", "{\"email\":\"invalido\"}", "email")]
    [InlineData("name", "{\"name\":\"  \"}", "name")]
    [InlineData("birthday", "{\"date\":\"2030-01-01\"}", "date")]
    [InlineData("contact", "{\"contact\":{\"email\":\"invalido\"}}", "contact.email")]
    public async Task Conversao_invalida_retorna_erro_de_validacao_com_caminho_do_campo(
        string toolName, string arguments, string field)
    {
        using var provider = Services();

        var result = await Invoke(provider, toolName, arguments, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var content = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject;
        using var json = JsonDocument.Parse(content.Text);
        var error = json.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("fieldErrors").GetProperty(field)[0].GetProperty("code").GetString().Should().Be("Validation.Failed");
    }

    [Fact]
    public async Task Vo_de_data_utiliza_time_provider_do_host()
    {
        using var provider = Services();

        var result = await Invoke(provider, "birthday", "{\"date\":\"2029-12-31\"}", TestContext.Current.CancellationToken);

        result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>()
            .Which.Text.Should().Be("2029-12-31");
    }

    [Fact]
    public void Schema_preserva_descricao_opcionalidade_e_formato_primitivo_dos_vos()
    {
        using var provider = Services();
        var tools = provider.GetServices<McpServerTool>().ToDictionary(tool => tool.ProtocolTool.Name);
        var email = tools["email"].ProtocolTool.InputSchema.GetProperty("properties").GetProperty("email");

        email.GetProperty("type").EnumerateArray().Select(type => type.GetString()).Should().BeEquivalentTo("string", "null");
        email.GetProperty("description").GetString().Should().Be("E-mail de contato.");
        email.GetProperty("default").ValueKind.Should().Be(JsonValueKind.Null);
        var nameSchema = tools["name"].ProtocolTool.InputSchema;
        nameSchema.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Contain("name");
        nameSchema.GetProperty("properties").GetProperty("name").GetProperty("type").GetString().Should().Be("string");
        var date = tools["birthday"].ProtocolTool.InputSchema.GetProperty("properties").GetProperty("date");
        date.GetProperty("type").GetString().Should().Be("string");
        date.GetProperty("format").GetString().Should().Be("date");
        tools.Values.Should().AllSatisfy(tool => tool.Metadata.OfType<AuthorizeAttribute>().Should().ContainSingle());
    }

    [Fact]
    public async Task Json_exception_da_ferramenta_nao_e_confundida_com_entrada_invalida()
    {
        using var provider = Services();

        var action = async () => await Invoke(provider, "failure", "{\"search\":\"vip\"}", TestContext.Current.CancellationToken);

        await action.Should().ThrowAsync<JsonException>().WithMessage("Falha interna de serialização.");
    }

    private static ServiceProvider Services()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSingleton<TimeProvider>(new FixedTimeProvider());
        services.AddMcpServer().WithValueObjectTools<ExampleTools>();
        return services.BuildServiceProvider();
    }

    private static async Task<CallToolResult> Invoke(IServiceProvider services, string name, string arguments, CancellationToken cancellationToken)
    {
        var tool = services.GetServices<McpServerTool>().Single(tool => tool.ProtocolTool.Name == name);
        await using var transport = new StreamServerTransport(Stream.Null, Stream.Null);
        await using var server = McpServer.Create(transport, new McpServerOptions(), serviceProvider: services);
        var request = new RequestContext<CallToolRequestParams>(server,
            new JsonRpcRequest { Id = new RequestId(1), Method = "tools/call" },
            new CallToolRequestParams
            {
                Name = name,
                Arguments = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(arguments),
            })
        { Services = services };
        return await tool.InvokeAsync(request, cancellationToken);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2030, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }

    public sealed record ContactInput(EmailAddress Email);

    [Authorize]
    private sealed class ExampleTools
    {
        [McpServerTool(Name = "email")]
        public static string Email([Description("E-mail de contato.")] EmailAddress? email = null) => email?.Value ?? "ausente";

        [McpServerTool(Name = "name")]
        public static string Name(FullName name) => name.Value;

        [McpServerTool(Name = "birthday")]
        public static string Birthday(BirthDate date) => date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        [McpServerTool(Name = "contact")]
        public static string Contact(ContactInput contact) => contact.Email.Value;

        [McpServerTool(Name = "failure")]
        public static string Failure(SearchText? search = null) => throw new JsonException("Falha interna de serialização.");
    }
}
