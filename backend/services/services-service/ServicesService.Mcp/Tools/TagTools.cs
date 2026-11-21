using System.ComponentModel;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Mcp.Setup;

namespace ServicesService.Mcp.Tools;

[Authorize]
[McpServerToolType]
public sealed class TagTools(IDispatcher dispatcher)
{
    // Same code the REST API gives a query value that fails conversion.
    private const string ValidationFailed = "Validation.Failed";

    [McpServerTool(
        Name = "agenza_list_tags",
        Title = "Listar etiquetas",
        ReadOnly = true,
        Destructive = false,
        Idempotent = true,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(PagedResult<TagResponse>))]
    [Description("Lista as etiquetas de clientes do negócio, com busca opcional pelo nome e paginação.")]
    public async Task<CallToolResult> ListTags(
        [Description("Texto procurado no nome da etiqueta. Omita para listar todas.")] string? search = null,
        [Description("Página desejada, começando em 1.")] int page = PageRequest.FirstPage,
        [Description("Quantidade de etiquetas por página.")] int pageSize = PageRequest.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        SearchText? searchText = null;
        if (!string.IsNullOrEmpty(search))
        {
            var parsed = SearchText.Create(search);
            if (parsed.IsFailure)
            {
                return ToolResultExtensions.Failure(Error.Validation(ValidationFailed, parsed.Error,
                    new Dictionary<string, IReadOnlyList<FieldError>>
                    {
                        [nameof(search)] = [new FieldError(ValidationFailed, parsed.Error)],
                    }));
            }

            searchText = parsed.Value;
        }

        var query = new ListTagsQuery(searchText) { Page = page, PageSize = pageSize };
        var result = await dispatcher.Query(query, cancellationToken);
        return result.ToToolResult();
    }
}
