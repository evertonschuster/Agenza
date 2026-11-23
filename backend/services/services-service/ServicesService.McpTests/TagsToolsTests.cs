using System.Text.Json;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;
using Result = Admin.SharedKernel.Result;

namespace ServicesService.McpTests;

public sealed class TagsToolsTests
{
    [Fact]
    public async Task Listagem_encaminha_busca_normalizada_paginacao_e_cancelamento_ao_dispatcher()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();
        var cancellationToken = TestContext.Current.CancellationToken;

        var result = await Invoke(scope.ServiceProvider, new { search = "  vIp  ", page = 3, pageSize = 50 }, cancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().BeEquivalentTo(new ListTagsQuery(SearchText.Create("vip").Value) { Page = 3, PageSize = 50 });
        handler.CancellationToken.Should().Be(cancellationToken);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" \t ")]
    public async Task Busca_ausente_ou_em_branco_nao_aplica_filtro_e_preserva_paginacao_padrao(string? search)
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { search }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().Be(new ListTagsQuery());
    }

    [Fact]
    public async Task Busca_acima_do_limite_retorna_erro_no_campo_sem_executar_consulta()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();
        var search = new string('a', SearchText.MaxLength + 1);

        var result = await Invoke(scope.ServiceProvider, new { search }, TestContext.Current.CancellationToken);

        var error = Error(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("type").GetString().Should().Be("Validation");
        error.GetProperty("fieldErrors").GetProperty("query.search")[0].GetProperty("message")
            .GetString().Should().Be(SearchText.Create(search).Error);
        handler.Query.Should().BeNull();
    }

    [Fact]
    public async Task Busca_no_limite_apos_remover_espacos_e_aceita()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();
        var search = new string('a', SearchText.MaxLength);

        var result = await Invoke(scope.ServiceProvider, new { search = "  " + search + "  " }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query!.Search!.Value.Should().Be(search);
    }

    [Fact]
    public async Task Objeto_query_vazio_reutiliza_os_valores_padrao_da_application()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().Be(new ListTagsQuery());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Query_ausente_ou_nula_retorna_erro_antes_do_dispatcher(bool includeQuery)
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, null, TestContext.Current.CancellationToken, includeQuery);

        var error = Error(result);
        error.GetProperty("fieldErrors").TryGetProperty("query", out _).Should().BeTrue();
        handler.Query.Should().BeNull();
    }

    [Theory]
    [InlineData(0, 20, "Page", "Paging.PageInvalid")]
    [InlineData(-1, 20, "Page", "Paging.PageInvalid")]
    [InlineData(1, 0, "PageSize", "Paging.PageSizeInvalid")]
    [InlineData(1, -1, "PageSize", "Paging.PageSizeInvalid")]
    [InlineData(1, 101, "PageSize", "Paging.PageSizeInvalid")]
    [InlineData(int.MaxValue, 100, "Page", "Paging.PageTooLarge")]
    public async Task Paginacao_invalida_reutiliza_validador_da_application_sem_executar_consulta(
        int page, int pageSize, string field, string code)
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { page, pageSize }, TestContext.Current.CancellationToken);

        var error = Error(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("fieldErrors").GetProperty(field)[0].GetProperty("code").GetString().Should().Be(code);
        handler.Query.Should().BeNull();
    }

    [Fact]
    public async Task Sucesso_preserva_etiquetas_e_metadados_no_conteudo_estruturado_e_textual()
    {
        var tag = new TagResponse(Guid.NewGuid(), "VIP", "#0d9488", null);
        var page = new PagedResult<TagResponse>([tag], 101, 2, 100);
        var handler = new RecordingHandler { Outcome = Result.Success(page) };
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { page = 2, pageSize = 100 }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        result.StructuredContent!.Value.Deserialize<PagedResult<TagResponse>>(McpJsonUtilities.DefaultOptions)
            .Should().BeEquivalentTo(page);
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject;
        text.Text.Should().Be(result.StructuredContent.Value.GetRawText());
    }

    [Theory]
    [InlineData(1, 0)]
    [InlineData(9, 5)]
    public async Task Pagina_vazia_preserva_total_e_paginacao_da_application(int pageNumber, int totalCount)
    {
        var page = new PagedResult<TagResponse>([], totalCount, pageNumber, 20);
        var handler = new RecordingHandler { Outcome = Result.Success(page) };
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, new { page = pageNumber }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        result.StructuredContent!.Value.Deserialize<PagedResult<TagResponse>>(McpJsonUtilities.DefaultOptions)
            .Should().BeEquivalentTo(page);
    }

    [Fact]
    public void Ferramenta_publica_contrato_paginado_somente_leitura_sem_entrada_de_usuario_ou_tenant()
    {
        using var provider = Services(new RecordingHandler());
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>().Single();
        var contract = tool.ProtocolTool;

        contract.Name.Should().Be("list_tags");
        contract.Title.Should().Be("Listar etiquetas");
        contract.Description.Should().Contain("empresa autenticada");
        var properties = contract.InputSchema.GetProperty("properties");
        properties.EnumerateObject().Select(property => property.Name).Should().Equal("query");
        contract.InputSchema.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Contain("query");
        var queryProperties = properties.GetProperty("query").GetProperty("properties");
        queryProperties.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo("search", "page", "pageSize");
        queryProperties.GetProperty("search").GetProperty("description").GetString().Should().Contain("Trecho do nome da etiqueta").And.Contain("não aplica filtro");
        queryProperties.GetProperty("search").GetProperty("type").EnumerateArray().Select(type => type.GetString())
            .Should().BeEquivalentTo("string", "null");
        queryProperties.GetProperty("page").GetProperty("description").GetString().Should().Contain("começando em 1");
        queryProperties.GetProperty("pageSize").GetProperty("description").GetString().Should().Contain("entre 1 e 100");
        queryProperties.GetProperty("page").GetProperty("default").GetInt32().Should().Be(PageRequest.FirstPage);
        queryProperties.GetProperty("pageSize").GetProperty("default").GetInt32().Should().Be(PageRequest.DefaultPageSize);
        contract.OutputSchema.Should().NotBeNull();
        contract.OutputSchema!.Value.GetProperty("properties").EnumerateObject().Select(property => property.Name)
            .Should().BeEquivalentTo("items", "totalCount", "page", "pageSize");
        contract.Annotations!.ReadOnlyHint.Should().BeTrue();
        contract.Annotations.DestructiveHint.Should().BeFalse();
        contract.Annotations.OpenWorldHint.Should().BeFalse();
    }

    private static JsonElement Error(CallToolResult result)
    {
        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject;
        using var json = JsonDocument.Parse(text.Text);
        return json.RootElement.GetProperty("error").Clone();
    }

    private static ServiceProvider Services(RecordingHandler handler)
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSharedKernel();
        services.AddServicesApplication();
        services.AddMcpServer().WithValueObjectTools<TagsTools>();
        services.AddScoped<IQueryHandler<ListTagsQuery, PagedResult<TagResponse>>>(_ => handler);
        return services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
    }

    private static async Task<CallToolResult> Invoke(IServiceProvider services, object? arguments, CancellationToken cancellationToken = default, bool includeQuery = true)
    {
        var tool = services.GetServices<McpServerTool>().Single();
        await using var transport = new StreamServerTransport(Stream.Null, Stream.Null);
        await using var server = McpServer.Create(transport, new McpServerOptions(), serviceProvider: services);
        var payload = JsonSerializer.SerializeToElement(new { query = arguments });
        if (!includeQuery)
        {
            payload = JsonSerializer.SerializeToElement(new { });
        }

        var context = new RequestContext<CallToolRequestParams>(server,
            new JsonRpcRequest { Id = new RequestId(1), Method = "tools/call" },
            new CallToolRequestParams
            {
                Name = "list_tags",
                Arguments = payload.Deserialize<Dictionary<string, JsonElement>>(),
            })
        { Services = services };
        return await tool.InvokeAsync(context, cancellationToken);
    }

    private sealed class RecordingHandler : IQueryHandler<ListTagsQuery, PagedResult<TagResponse>>
    {
        public ListTagsQuery? Query { get; private set; }

        public CancellationToken CancellationToken { get; private set; }

        public Result<PagedResult<TagResponse>> Outcome { get; init; } = Result.Success(new PagedResult<TagResponse>([], 0, 1, 20));

        public Task<Result<PagedResult<TagResponse>>> Handle(ListTagsQuery query, CancellationToken cancellationToken)
        {
            Query = query;
            CancellationToken = cancellationToken;
            return Task.FromResult(Outcome);
        }
    }
}
