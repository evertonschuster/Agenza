using System.ComponentModel;
using Admin.SharedKernel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.CreateTag;
using ServicesService.Application.Tags.GetTagById;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Tools;

[Authorize]
[McpServerToolType]
public sealed class TagsTools(IDispatcher dispatcher)
{
    [McpServerTool(
        Name = "list_tags",
        Title = "Listar etiquetas",
        ReadOnly = true,
        Destructive = false,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(PagedResult<TagResponse>))]
    [Description(
        "Lista as etiquetas da empresa autenticada, com busca opcional por trecho do nome e paginação. " +
        "A busca ignora maiúsculas e minúsculas. Os resultados são ordenados por nome e, em caso de empate, por ID. " +
        "Retorna os itens, o total de etiquetas que correspondem à busca, a página e o tamanho da página. " +
        "Uma busca sem correspondência ou uma página além dos resultados retorna uma lista vazia. " +
        "Não informe usuário ou empresa como entrada.")]
    public async Task<CallToolResult> ListTags(
        [Description("Filtros opcionais de busca e paginação das etiquetas. Omita para usar a paginação padrão, sem filtro.")]
        ListTagsQuery? query = null,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Query(query ?? new ListTagsQuery(), cancellationToken);
        return result.ToToolResult();
    }

    [McpServerTool(
        Name = "create_tag",
        Title = "Criar etiqueta",
        ReadOnly = false,
        Destructive = false,
        Idempotent = false,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(TagResponse))]
    [Description(
        "Cria uma etiqueta na empresa autenticada e retorna seus dados. " +
        "Informe o nome e uma cor da paleta. A descrição é opcional. " +
        "Se o nome já estiver em uso na empresa, a criação retorna um conflito.")]
    public async Task<CallToolResult> CreateTag(
        [Description("Dados da etiqueta a criar.")]
        CreateTagCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Send(command, cancellationToken);
        return result.ToToolResult();
    }

    [McpServerTool(
        Name = "get_tag_by_id",
        Title = "Consultar etiqueta por ID",
        ReadOnly = true,
        Destructive = false,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(TagResponse))]
    [Description(
        "Consulta uma etiqueta da empresa autenticada pelo ID e retorna seu nome, cor e descrição. " +
        "Use o ID retornado por list_tags ou create_tag. Se você só tiver o nome, use list_tags.")]
    public async Task<CallToolResult> GetTagById(
        [Description("Identificador da etiqueta a consultar.")]
        GetTagByIdQuery query,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Query(query, cancellationToken);
        return result.ToToolResult();
    }
}
