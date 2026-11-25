using System.Text.Json;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application;
using ServicesService.Application.Clients.ListClients;
using ServicesService.Application.Tags;
using ServicesService.Domain.Entities;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;
using static ServicesService.McpTests.ClientToolAssertions;
using Result = Admin.SharedKernel.Result;

namespace ServicesService.McpTests;

public sealed class ClientsToolsTests
{
    [Fact]
    public async Task Listagem_encaminha_busca_situacao_paginacao_e_cancelamento_ao_dispatcher()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider,
            new { search = "  maria  ", status = "Inactive", page = 2, pageSize = 50 },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().BeEquivalentTo(
            new ListClientsQuery(SearchText.Create("maria").Value, ClientStatusFilter.Inactive) { Page = 2, PageSize = 50 });
        handler.CancellationToken.CanBeCanceled.Should().BeTrue();
    }

    [Theory]
    [InlineData("Active", ClientStatusFilter.Active)]
    [InlineData("Inactive", ClientStatusFilter.Inactive)]
    [InlineData("All", ClientStatusFilter.All)]
    public async Task Situacao_informada_chega_ao_dispatcher(string status, ClientStatusFilter expected)
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { status }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query!.Status.Should().Be(expected);
    }

    [Fact]
    public async Task Consulta_omitida_lista_com_paginacao_padrao_sem_busca_e_sem_situacao()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await McpToolCall.InvokeAsync(scope.ServiceProvider, "list_clients",
            new Dictionary<string, object?>(), TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().BeEquivalentTo(new ListClientsQuery());
        handler.Query!.Status.Should().BeNull();
    }

    [Fact]
    public async Task Consulta_nula_lista_com_paginacao_padrao_sem_busca_e_sem_situacao()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, null, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().BeEquivalentTo(new ListClientsQuery());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Busca_em_branco_chega_sem_filtro(string search)
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { search }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().BeEquivalentTo(new ListClientsQuery());
    }

    [Fact]
    public async Task Busca_acima_do_limite_falha_no_binding_sem_executar_consulta()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();
        var search = new string('a', SearchText.MaxLength + 1);

        var result = await Invoke(scope.ServiceProvider, new { search }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("fieldErrors").TryGetProperty("query.search", out _).Should().BeTrue();
        handler.Query.Should().BeNull();
    }

    [Fact]
    public async Task Situacao_desconhecida_falha_no_binding_identificando_o_campo_sem_executar_consulta()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { status = "Arquivado" }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("fieldErrors").TryGetProperty("query.status", out _).Should().BeTrue();
        handler.Query.Should().BeNull();
    }

    [Theory]
    [InlineData("page")]
    [InlineData("pageSize")]
    public async Task Paginacao_fracionaria_identifica_o_campo_sem_executar_a_listagem(string field)
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new Dictionary<string, double> { [field] = 1.5 },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        var error = ErrorOf(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString()
            .Should().Be($"query.{field}: esperado número inteiro, recebeu número não inteiro.");
        handler.Query.Should().BeNull();
    }

    [Fact]
    public async Task Listagem_retorna_os_clientes_estruturados_com_etiquetas_e_paginacao()
    {
        var clientId = Guid.NewGuid();
        var tag = new TagSummary(Guid.NewGuid(), "VIP", "#0d9488");
        var item = new ClientListItemResponse(clientId, "Maria Souza", new DateOnly(1990, 5, 17),
            "11999998888", "maria@example.com", "52998224725", ClientStatus.Active, [tag]);
        var handler = new RecordingHandler
        {
            Outcome = Result.Success(new PagedResult<ClientListItemResponse>([item], 41, 3, 20)),
        };
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { page = 3 }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        var content = result.StructuredContent!.Value;
        content.GetProperty("totalCount").GetInt32().Should().Be(41);
        content.GetProperty("page").GetInt32().Should().Be(3);
        content.GetProperty("pageSize").GetInt32().Should().Be(20);
        var returned = content.GetProperty("items").EnumerateArray().Single();
        returned.GetProperty("id").GetGuid().Should().Be(clientId);
        returned.GetProperty("fullName").GetString().Should().Be("Maria Souza");
        returned.GetProperty("email").GetString().Should().Be("maria@example.com");
        returned.GetProperty("cpf").GetString().Should().Be("52998224725");
        returned.GetProperty("status").GetString().Should().Be("active");
        returned.GetProperty("tags").EnumerateArray().Single().GetProperty("name").GetString().Should().Be("VIP");
    }

    [Theory]
    [InlineData("page", 0)]
    [InlineData("pageSize", 0)]
    [InlineData("pageSize", 101)]
    public async Task Paginacao_fora_dos_limites_e_recusada_pelo_validador_da_aplicacao_sem_executar_a_listagem(string field, int value)
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new Dictionary<string, int> { [field] = value },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        ErrorOf(result).GetProperty("code").GetString().Should().Be("Validation.Failed");
        handler.Query.Should().BeNull();
    }

    [Fact]
    public async Task Falha_do_handler_retorna_o_codigo_da_aplicacao_sem_conteudo_estruturado()
    {
        var handler = new RecordingHandler
        {
            Outcome = Result.Failure<PagedResult<ClientListItemResponse>>(
                Error.Conflict("Client.Falha", "Falha de teste.")),
        };
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        ErrorOf(result).GetProperty("code").GetString().Should().Be("Client.Falha");
    }

    [Fact]
    public void Ferramenta_publica_contrato_paginado_somente_leitura_sem_entrada_de_usuario_ou_empresa()
    {
        using var provider = Services(new RecordingHandler());
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>().Single(tool => tool.ProtocolTool.Name == "list_clients");
        var contract = tool.ProtocolTool;

        contract.Title.Should().Be("Listar clientes");
        contract.Description.Should().Contain("empresa autenticada").And.Contain("CPF");
        var properties = contract.InputSchema.GetProperty("properties");
        properties.EnumerateObject().Select(property => property.Name).Should().Equal("query");
        (contract.InputSchema.TryGetProperty("required", out var required)
            ? required.EnumerateArray().Select(item => item.GetString())
            : []).Should().NotContain("query");
        var queryProperties = properties.GetProperty("query").GetProperty("properties");
        queryProperties.EnumerateObject().Select(property => property.Name)
            .Should().BeEquivalentTo("search", "status", "page", "pageSize");
        queryProperties.GetProperty("search").GetProperty("description").GetString()
            .Should().Contain("nome, do e-mail ou do CPF").And.Contain("não aplica filtro");
        queryProperties.GetProperty("status").GetProperty("description").GetString()
            .Should().Contain("active").And.Contain("inactive").And.Contain("all");
        queryProperties.GetProperty("page").GetProperty("default").GetInt32().Should().Be(PageRequest.FirstPage);
        queryProperties.GetProperty("pageSize").GetProperty("default").GetInt32().Should().Be(PageRequest.DefaultPageSize);
        contract.OutputSchema.Should().NotBeNull();
        contract.OutputSchema!.Value.GetProperty("properties").EnumerateObject().Select(property => property.Name)
            .Should().BeEquivalentTo("items", "totalCount", "page", "pageSize");
        MissingDescriptions(contract.InputSchema, "input").Should().BeEmpty();
        contract.Annotations!.ReadOnlyHint.Should().BeTrue();
        contract.Annotations.DestructiveHint.Should().BeFalse();
        contract.Annotations.OpenWorldHint.Should().BeFalse();
        tool.Metadata.OfType<AuthorizeAttribute>().Should().ContainSingle();
    }


    private static ServiceProvider Services(RecordingHandler handler)
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSharedKernel();
        services.AddServicesApplication();
        services.AddAuthorization();
        var jsonOptions = services.AddMcpValueObjectInputs(TimeProvider.System);
        services.AddMcpServer().WithToolExceptionHandling().WithTools<ClientsTools>(jsonOptions);
        services.AddScoped<IQueryHandler<ListClientsQuery, PagedResult<ClientListItemResponse>>>(_ => handler);
        var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _ = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;
        return provider;
    }

    private static Task<CallToolResult> Invoke(IServiceProvider services, object? query, CancellationToken cancellationToken) =>
        McpToolCall.InvokeAsync(services, "list_clients", new Dictionary<string, object?> { ["query"] = query }, cancellationToken);

    private sealed class RecordingHandler : IQueryHandler<ListClientsQuery, PagedResult<ClientListItemResponse>>
    {
        public ListClientsQuery? Query { get; private set; }

        public CancellationToken CancellationToken { get; private set; }

        public Result<PagedResult<ClientListItemResponse>> Outcome { get; init; } =
            Result.Success(new PagedResult<ClientListItemResponse>([], 0, 1, 20));

        public Task<Result<PagedResult<ClientListItemResponse>>> Handle(ListClientsQuery query, CancellationToken cancellationToken)
        {
            Query = query;
            CancellationToken = cancellationToken;
            return Task.FromResult(Outcome);
        }
    }
}
