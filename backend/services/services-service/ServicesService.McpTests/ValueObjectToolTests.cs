using System.ComponentModel;
using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
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

    [Theory]
    [InlineData("{}", "name")]
    [InlineData("{\"name\":null,\"email\":\"maria@exemplo.com\"}", "name")]
    [InlineData("{\"name\":\"Maria\",\"email\":null}", "email")]
    [InlineData("{\"name\":\"Maria\",\"email\":\"  \"}", "email")]
    [InlineData("{\"name\":\"\",\"email\":\"invalido\"}", "name")]
    public async Task Dois_vos_recusam_ausencia_null_e_valores_invalidos_antes_da_execucao(string arguments, string field)
    {
        using var provider = Services();
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, "pair", arguments, TestContext.Current.CancellationToken);

        var error = Error(result);
        error.GetProperty("fieldErrors").TryGetProperty(field, out _).Should().BeTrue();
        scope.ServiceProvider.GetRequiredService<InvocationProbe>().Calls.Should().Be(0);
    }

    [Theory]
    [InlineData("birthday", "{\"date\":\"nao-e-data\"}", "date")]
    [InlineData("birthday", "{\"date\":123}", "date")]
    [InlineData("contacts", "{\"contacts\":[{\"email\":\"invalido\"}]}", "contacts[0].email")]
    public async Task Erros_estruturais_e_de_colecao_tem_campo_identificado_e_mensagem_em_portugues(
        string name, string arguments, string field)
    {
        using var provider = Services();

        var result = await Invoke(provider, name, arguments, TestContext.Current.CancellationToken);

        var error = Error(result);
        error.GetProperty("fieldErrors").GetProperty(field)[0].GetProperty("message").GetString()
            .Should().BeOneOf("O valor informado é inválido para este campo.", EmailAddress.Create("invalido").Error);
    }

    [Fact]
    public async Task Todos_os_campos_invalidos_voltam_na_mesma_resposta()
    {
        using var provider = Services();
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, "pair", "{\"name\":\"\",\"email\":\"invalido\"}", TestContext.Current.CancellationToken);

        var fieldErrors = Error(result).GetProperty("fieldErrors");
        fieldErrors.EnumerateObject().Select(field => field.Name).Should().BeEquivalentTo("name", "email");
        fieldErrors.GetProperty("email")[0].GetProperty("message").GetString().Should().Be(EmailAddress.Create("invalido").Error);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Pipeline_de_autorizacao_permite_ou_recusa_ferramenta_com_dois_vos(bool authenticated)
    {
        using var provider = Services();
        using var scope = provider.CreateScope();
        var services = scope.ServiceProvider;
        var tool = services.GetServices<McpServerTool>().Single(tool => tool.ProtocolTool.Name == "pair");
        var options = services.GetRequiredService<IOptions<McpServerOptions>>().Value;
        await using var transport = new StreamServerTransport(Stream.Null, Stream.Null);
        await using var server = McpServer.Create(transport, options, serviceProvider: services);
        var identity = new ClaimsIdentity();
        if (authenticated)
        {
            identity = new ClaimsIdentity("Bearer");
        }

        var context = new RequestContext<CallToolRequestParams>(server,
            new JsonRpcRequest { Id = new RequestId(1), Method = "tools/call" },
            new CallToolRequestParams
            {
                Name = "pair",
                Arguments = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>("{\"name\":\" Maria \" ,\"email\":\" MARIA@EXEMPLO.COM \"}"),
            })
        { Services = services, User = new ClaimsPrincipal(identity), MatchedPrimitive = tool };
        McpRequestHandler<CallToolRequestParams, CallToolResult> handler = (request, token) => tool.InvokeAsync(request, token);
        foreach (var filter in options.Filters.Request.CallToolFilters.Reverse())
        {
            handler = filter(handler);
        }

        var action = async () => await handler(context, TestContext.Current.CancellationToken);
        var probe = services.GetRequiredService<InvocationProbe>();
        if (!authenticated)
        {
            await action.Should().ThrowAsync<McpProtocolException>();
            probe.Calls.Should().Be(0);
            return;
        }

        var result = await action();
        result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>()
            .Which.Text.Should().Be("Maria|maria@exemplo.com");
        probe.Calls.Should().Be(1);
        probe.CancellationToken.Should().Be(TestContext.Current.CancellationToken);
    }

    [Fact]
    public void Servico_com_chave_e_recusado_no_registro_porque_o_sdk_nao_o_resolve()
    {
        var action = () => new ServiceCollection().AddMcpServer().WithValueObjectTools<KeyedTools>();

        action.Should().Throw<NotSupportedException>().WithMessage("*FromKeyedServices*");
    }

    private static JsonElement Error(CallToolResult result)
    {
        result.IsError.Should().BeTrue();
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject.Text;
        using var json = JsonDocument.Parse(text);
        var error = json.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        return error.Clone();
    }

    private static ServiceProvider Services()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSingleton<TimeProvider>(new FixedTimeProvider());
        services.AddScoped<InvocationProbe>();
        services.AddAuthorization();
        services.AddMcpServer().AddAuthorizationFilters().WithValueObjectTools<ExampleTools>();
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
        public int Calls { get; private set; }

        public override DateTimeOffset GetUtcNow()
        {
            Calls++;
            return new(2030, 1, 1, 0, 0, 0, TimeSpan.Zero);
        }
    }

    private sealed class InvocationProbe
    {
        public int Calls { get; set; }

        public CancellationToken CancellationToken { get; set; }
    }

    public sealed record ContactInput(EmailAddress Email);

    private sealed class KeyedTools
    {
        [McpServerTool(Name = "keyed")]
        public static string Keyed(FullName name, [FromKeyedServices("selected")] object label) => name.Value;
    }

    [Authorize]
    private sealed class ExampleTools(InvocationProbe probe)
    {
        [McpServerTool(Name = "email")]
        public static string Email([Description("E-mail de contato.")] EmailAddress? email = null) => email?.Value ?? "ausente";

        [McpServerTool(Name = "name")]
        public static string Name(FullName name) => name.Value;

        [McpServerTool(Name = "birthday")]
        public static string Birthday(BirthDate date) => date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        [McpServerTool(Name = "contact")]
        public static string Contact(ContactInput contact) => contact.Email.Value;

        [McpServerTool(Name = "contacts")]
        public static string Contacts(IReadOnlyList<ContactInput> contacts) => contacts[0].Email.Value;

        [McpServerTool(Name = "pair")]
        public string Pair(FullName name, EmailAddress email, InvocationProbe methodProbe, CancellationToken cancellationToken)
        {
            ReferenceEquals(probe, methodProbe).Should().BeTrue();
            probe.Calls++;
            probe.CancellationToken = cancellationToken;
            return name.Value + "|" + email.Value;
        }

        [McpServerTool(Name = "failure")]
        public static string Failure(SearchText? search = null) => throw new JsonException("Falha interna de serialização.");
    }
}
