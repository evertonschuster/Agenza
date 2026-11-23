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
        [Description("Trecho do nome da etiqueta. Ausente, vazio ou somente espaços não aplica filtro. Limite de 254 caracteres após remover espaços nas extremidades.")]
        SearchText? search = null,
        [Description("Página dos resultados, começando em 1. Padrão: 1.")]
        int page = PageRequest.FirstPage,
        [Description("Quantidade de etiquetas por página, entre 1 e 100. Padrão: 20.")]
        int pageSize = PageRequest.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var query = new ListTagsQuery(search) { Page = page, PageSize = pageSize };
        var result = await dispatcher.Query(query, cancellationToken);
        return result.ToToolResult();
    }
}
