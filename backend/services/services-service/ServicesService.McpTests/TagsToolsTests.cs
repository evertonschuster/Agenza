using System.Text.Json;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.GetTagById;
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
        handler.CancellationToken.CanBeCanceled.Should().BeTrue();
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
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("type").GetString().Should().Be("Validation");
        var message = error.GetProperty("message").GetString();
        message.Should().StartWith(SearchText.Create(search).Error);
        error.GetProperty("fieldErrors").GetProperty("query.search")[0].GetProperty("message").GetString()
            .Should().Be(message);
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
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("type").GetString().Should().Be("Validation");
        var message = error.GetProperty("message").GetString();
        message.Should().Be($"query.{field}: esperado número inteiro, recebeu número não inteiro.");
        var fieldError = error.GetProperty("fieldErrors").GetProperty($"query.{field}")[0];
        fieldError.GetProperty("code").GetString().Should().Be("Validation.Failed");
        fieldError.GetProperty("message").GetString().Should().Be("Esperado número inteiro, recebeu número não inteiro.");
        handler.Query.Should().BeNull();
    }

    [Fact]
    public async Task Consulta_omitida_lista_com_paginacao_padrao_e_sem_filtro()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await McpToolCall.InvokeAsync(scope.ServiceProvider, "list_tags", new Dictionary<string, object?>(),
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().BeEquivalentTo(new ListTagsQuery());
    }

    [Fact]
    public async Task Consulta_nula_lista_com_paginacao_padrao_e_sem_filtro()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await Invoke(scope.ServiceProvider, null, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().BeEquivalentTo(new ListTagsQuery());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Busca_ausente_ou_em_branco_chega_sem_filtro_com_paginacao_padrao(string? search)
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();
        var query = search is null ? new Dictionary<string, object?>() : new Dictionary<string, object?> { ["search"] = search };

        var result = await Invoke(scope.ServiceProvider, query, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        handler.Query.Should().BeEquivalentTo(new ListTagsQuery());
    }

    [Fact]
    public void Ferramenta_publica_contrato_paginado_somente_leitura_sem_entrada_de_usuario_ou_tenant()
    {
        using var provider = Services(new RecordingHandler());
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>().Single(tool => tool.ProtocolTool.Name == "list_tags");
        var contract = tool.ProtocolTool;

        contract.Name.Should().Be("list_tags");
        contract.Title.Should().Be("Listar etiquetas");
        contract.Description.Should().Contain("empresa autenticada");
        var properties = contract.InputSchema.GetProperty("properties");
        properties.EnumerateObject().Select(property => property.Name).Should().Equal("query");
        (contract.InputSchema.TryGetProperty("required", out var required)
            ? required.EnumerateArray().Select(item => item.GetString())
            : []).Should().NotContain("query");
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
        tool.Metadata.OfType<AuthorizeAttribute>().Should().ContainSingle();
    }

    [Fact]
    public void Consulta_por_id_publica_uuid_obrigatorio_e_orienta_a_busca_por_nome()
    {
        using var provider = Services(new RecordingHandler());
        using var scope = provider.CreateScope();
        var tool = scope.ServiceProvider.GetServices<McpServerTool>()
            .Single(tool => tool.ProtocolTool.Name == "get_tag_by_id").ProtocolTool;

        tool.Annotations!.ReadOnlyHint.Should().BeTrue();
        tool.Description.Should().Contain("empresa autenticada").And.Contain("list_tags");
        tool.InputSchema.GetProperty("required").EnumerateArray().Select(item => item.GetString())
            .Should().Equal("query");
        var query = tool.InputSchema.GetProperty("properties").GetProperty("query");
        query.GetProperty("required").EnumerateArray().Select(item => item.GetString()).Should().Equal("tagId");
        var fields = query.GetProperty("properties");
        fields.EnumerateObject().Select(property => property.Name).Should().Equal("tagId");
        var id = fields.GetProperty("tagId");
        id.GetProperty("type").GetString().Should().Be("string");
        id.GetProperty("format").GetString().Should().Be("uuid");
        id.GetProperty("description").GetString().Should().Contain("ID da etiqueta");
        tool.OutputSchema!.Value.GetProperty("properties").EnumerateObject().Select(property => property.Name)
            .Should().BeEquivalentTo("id", "name", "color", "description");
    }

    [Fact]
    public async Task Consulta_por_id_encaminha_a_consulta_e_retorna_a_etiqueta_estruturada()
    {
        var tag = new TagResponse(Guid.NewGuid(), "VIP", "#0d9488", "Clientes recorrentes");
        var handler = new RecordingByIdHandler(Result.Success(tag));
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await InvokeById(scope.ServiceProvider, new { tagId = tag.Id }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeFalse();
        result.StructuredContent!.Value.Deserialize<TagResponse>(JsonSerializerOptions.Web).Should().Be(tag);
        handler.Query.Should().Be(new GetTagByIdQuery(tag.Id));
    }

    [Fact]
    public async Task Consulta_sem_etiqueta_visivel_retorna_o_codigo_de_nao_encontrado()
    {
        var handler = new RecordingByIdHandler(Result.Failure<TagResponse>(
            Error.NotFound("Tag.NotFound", "Etiqueta não encontrada.")));
        using var provider = Services(handler);
        using var scope = provider.CreateScope();

        var result = await InvokeById(scope.ServiceProvider, new { tagId = Guid.NewGuid() }, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        document.RootElement.GetProperty("error").GetProperty("code").GetString().Should().Be("Tag.NotFound");
    }

    [Theory]
    [InlineData(null, "Informe os parâmetros da consulta.")]
    [InlineData("{}", "O ID da etiqueta é obrigatório.")]
    [InlineData("""{"tagId":"00000000-0000-0000-0000-000000000000"}""", "O ID da etiqueta é obrigatório.")]
    [InlineData("""{"tagId":"VIP"}""", "Path: $.tagId")]
    [InlineData("""{"tagId":123}""", "query.tagId: esperado texto, recebeu número.")]
    public async Task Consulta_com_id_ausente_ou_invalido_retorna_validacao_sem_consultar(string? json, string message)
    {
        var handler = new RecordingByIdHandler(Result.Failure<TagResponse>(Error.NotFound("Tag.NotFound", "Etiqueta não encontrada.")));
        using var provider = Services(handler);
        using var scope = provider.CreateScope();
        using var query = json is null ? null : JsonDocument.Parse(json);

        var result = await InvokeById(scope.ServiceProvider, query?.RootElement, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain(message);
        handler.Query.Should().BeNull();
    }

    private static ServiceProvider Services<TQuery, TResponse>(IQueryHandler<TQuery, TResponse> handler)
        where TQuery : IQuery<TResponse>
    {
        var services = new ServiceCollection().AddLogging();
        services.AddSharedKernel();
        services.AddServicesApplication();
        services.AddAuthorization();
        var jsonOptions = services.AddMcpValueObjectInputs(TimeProvider.System);
        services.AddMcpServer().WithToolExceptionHandling().WithTools<TagsTools>(jsonOptions);
        services.AddScoped<IQueryHandler<TQuery, TResponse>>(_ => handler);
        var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _ = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;
        return provider;
    }

    private static Task<CallToolResult> Invoke(IServiceProvider services, object? query, CancellationToken cancellationToken) =>
        McpToolCall.InvokeAsync(services, "list_tags", new Dictionary<string, object?> { ["query"] = query }, cancellationToken);

    private static Task<CallToolResult> InvokeById(IServiceProvider services, object? query, CancellationToken cancellationToken) =>
        McpToolCall.InvokeAsync(services, "get_tag_by_id", new Dictionary<string, object?> { ["query"] = query }, cancellationToken);

    private sealed class RecordingByIdHandler(Result<TagResponse> outcome) : IQueryHandler<GetTagByIdQuery, TagResponse>
    {
        public GetTagByIdQuery? Query { get; private set; }

        public Task<Result<TagResponse>> Handle(GetTagByIdQuery query, CancellationToken cancellationToken)
        {
            Query = query;
            return Task.FromResult(outcome);
        }
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
