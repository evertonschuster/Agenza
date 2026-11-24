using System.ComponentModel;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application.Tags;
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
        [Description("Filtros de busca e paginação das etiquetas. Informe um objeto vazio para usar a paginação padrão, sem filtro.")]
        ListTagsInput query,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        SearchText? search = null;
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var parsed = SearchText.Create(query.Search);
            if (parsed.IsFailure)
            {
                return Error.Validation("Validation.Failed", parsed.Error).ToToolResult();
            }

            search = parsed.Value;
        }

        var result = await dispatcher.Query(new ListTagsQuery(search)
        {
            Page = query.Page,
            PageSize = query.PageSize,
        }, cancellationToken);
        return result.ToToolResult();
    }
}
