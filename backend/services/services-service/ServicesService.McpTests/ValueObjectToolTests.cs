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
    [InlineData("email", "{\"email\":\"invalido\"}")]
    [InlineData("name", "{\"name\":\"  \"}")]
    [InlineData("birthday", "{\"date\":\"2030-01-01\"}")]
    [InlineData("contact", "{\"contact\":{\"email\":\"invalido\"}}")]
    public async Task Conversao_invalida_retorna_erro_nativo_do_sdk(
        string toolName, string arguments)
    {
        using var provider = Services();

        var result = await Invoke(provider, toolName, arguments, TestContext.Current.CancellationToken);

        AssertNativeError(result);
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
    public async Task Excecao_interna_da_ferramenta_e_ocultada_pelo_sdk()
    {
        using var provider = Services();

        var result = await Invoke(provider, "failure", "{\"search\":\"vip\"}", TestContext.Current.CancellationToken);

        AssertNativeError(result);
        result.Content.OfType<TextContentBlock>().Single().Text.Should().NotContain("Falha interna de serialização.");
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"name\":null,\"email\":\"maria@exemplo.com\"}")]
    [InlineData("{\"name\":\"Maria\",\"email\":null}")]
    [InlineData("{\"name\":\"Maria\",\"email\":\"  \"}")]
    [InlineData("{\"name\":\"\",\"email\":\"invalido\"}")]
    public async Task Dois_vos_recusam_ausencia_null_e_valores_invalidos_antes_da_execucao(string arguments)
    {
        using var provider = Services();
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, "pair", "{\"pair\":" + arguments + "}", TestContext.Current.CancellationToken);

        AssertNativeError(result);
        provider.GetRequiredService<InvocationHistory>().Calls.Should().Be(0);
    }

    [Theory]
    [InlineData("birthday", "{\"date\":\"nao-e-data\"}")]
    [InlineData("birthday", "{\"date\":123}")]
    [InlineData("contacts", "{\"contacts\":[{\"email\":\"invalido\"}]}")]
    public async Task Erros_estruturais_e_de_colecao_sao_recusados_pelo_sdk(
        string name, string arguments)
    {
        using var provider = Services();

        var result = await Invoke(provider, name, arguments, TestContext.Current.CancellationToken);

        AssertNativeError(result);
    }

    [Theory]
    [InlineData("2029-12-31", false)]
    [InlineData("2030-01-01", true)]
    public async Task Vo_dependente_de_tempo_e_convertido_uma_unica_vez(string date, bool failure)
    {
        using var provider = Services();

        var result = await Invoke(provider, "birthday", JsonSerializer.Serialize(new { date }), TestContext.Current.CancellationToken);

        (result.IsError is true).Should().Be(failure);
        ((FixedTimeProvider)provider.GetRequiredService<TimeProvider>()).Calls.Should().Be(1);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Pipeline_de_autorizacao_permite_ou_recusa_ferramenta_com_dois_vos(bool authenticated)
    {
        using var provider = Services(authorization: true);
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
                Arguments = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>("{\"pair\":{\"name\":\" Maria \" ,\"email\":\" MARIA@EXEMPLO.COM \"}}"),
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

    [Theory]
    [InlineData("{\"name\":\"Maria\"}", "Maria|-|-|False")]
    [InlineData("{\"name\":\"Maria\",\"count\":null,\"kind\":null}", "Maria|-|-|False")]
    [InlineData("{\"name\":\"Maria\",\"count\":3,\"kind\":\"vip\",\"flag\":true}", "Maria|3|Vip|True")]
    public async Task Binding_nativo_preserva_valores_opcionais_e_conversores(string arguments, string expected)
    {
        using var provider = Services();

        var result = await Invoke(provider, "wire", arguments, TestContext.Current.CancellationToken);

        result.IsError.Should().NotBeTrue();
        result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Which.Text.Should().Be(expected);
    }

    [Theory]
    [InlineData("{\"name\":\"Maria\",\"count\":\"abc\"}")]
    [InlineData("{\"name\":\"Maria\",\"count\":1.5}")]
    [InlineData("{\"name\":\"Maria\",\"kind\":\"premium\"}")]
    [InlineData("{\"name\":\"Maria\",\"kind\":1}")]
    [InlineData("{\"name\":\"Maria\",\"flag\":\"sim\"}")]
    [InlineData("{\"name\":\"Maria\",\"nested\":{\"count\":\"x\"}}")]
    [InlineData("{\"name\":\"Maria\",\"nested\":{\"kinds\":[\"regular\",\"x\"]}}")]
    public async Task Entrada_estrutural_invalida_retorna_erro_nativo_sem_detalhes_internos(string arguments)
    {
        using var provider = Services();

        var result = await Invoke(provider, "wire", arguments, TestContext.Current.CancellationToken);

        AssertNativeError(result);
    }

    [Fact]
    public void Servico_com_chave_e_recusado_no_registro_porque_o_sdk_nao_o_resolve()
    {
        var action = () => new ServiceCollection().AddMcpServer().WithValueObjectTools<KeyedTools>();

        action.Should().Throw<NotSupportedException>().WithMessage("*FromKeyedServices*");
    }

    private static void AssertNativeError(CallToolResult result)
    {
        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>()
            .Which.Text.Should().NotBeNullOrWhiteSpace().And.NotContain("Unexpected.Error").And.NotContain("fieldErrors");
    }

    private static ServiceProvider Services(bool authorization = false)
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSingleton<TimeProvider>(new FixedTimeProvider());
        services.AddSingleton<InvocationHistory>();
        services.AddScoped<InvocationProbe>();
        services.AddAuthorization();
        var builder = services.AddMcpServer().WithValueObjectTools<ExampleTools>();
        if (authorization)
        {
            builder.AddAuthorizationFilters();
        }
        return services.BuildServiceProvider();
    }

    private static async Task<CallToolResult> Invoke(IServiceProvider services, string name, string arguments, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<Dictionary<string, object?>>(arguments)!;
        return await McpToolCall.InvokeAsync(services, name, payload, cancellationToken);
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

    private sealed class InvocationHistory
    {
        public int Calls { get; set; }
    }

    private sealed class InvocationProbe(InvocationHistory history)
    {
        public int Calls
        {
            get => history.Calls;
            set => history.Calls = value;
        }

        public CancellationToken CancellationToken { get; set; }
    }

    public sealed record ContactInput(EmailAddress Email);

    public sealed record PairInput(FullName Name, EmailAddress Email);

    public enum Kind
    {
        Regular = 1,
        Vip = 2,
    }

    public sealed record NestedInput(int? Count = null, IReadOnlyList<Kind>? Kinds = null);

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
        public string Pair(PairInput pair, InvocationProbe methodProbe, CancellationToken cancellationToken)
        {
            ReferenceEquals(probe, methodProbe).Should().BeTrue();
            probe.Calls++;
            probe.CancellationToken = cancellationToken;
            return pair.Name.Value + "|" + pair.Email.Value;
        }

        [McpServerTool(Name = "wire")]
        public static string Wire(FullName name, int? count = null, Kind? kind = null, bool flag = false, NestedInput? nested = null) =>
            $"{name.Value}|{count?.ToString(CultureInfo.InvariantCulture) ?? "-"}|{kind?.ToString() ?? "-"}|{flag}";

        [McpServerTool(Name = "failure")]
        public static string Failure(SearchText? search = null) => throw new JsonException("Falha interna de serialização.");
    }
}
