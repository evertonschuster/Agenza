using System.Text.Json;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.ListTags;
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
    public async Task Busca_acima_do_limite_retorna_erro_do_vo_sem_executar_consulta()
    {
        var handler = new RecordingHandler();
        using var provider = Services(handler);
        using var scope = provider.CreateScope();
        var search = new string('a', SearchText.MaxLength + 1);

        var result = await Invoke(scope.ServiceProvider, new { search }, TestContext.Current.CancellationToken);

        var error = Error(result);
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Be(SearchText.Create(search).Error);
        handler.Query.Should().BeNull();
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
        tool.Metadata.OfType<AuthorizeAttribute>().Should().ContainSingle();
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
        services.AddAuthorization();
        services.AddMcpServer().WithTools<TagsTools>();
        services.AddScoped<IQueryHandler<ListTagsQuery, PagedResult<TagResponse>>>(_ => handler);
        return services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
    }

    private static Task<CallToolResult> Invoke(IServiceProvider services, object query, CancellationToken cancellationToken) =>
        McpToolCall.InvokeAsync(services, "list_tags", new Dictionary<string, object?> { ["query"] = query }, cancellationToken);

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
