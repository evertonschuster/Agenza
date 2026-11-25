using System.ComponentModel;
using Admin.SharedKernel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application.Clients;
using ServicesService.Application.Clients.GetClientById;
using ServicesService.Application.Clients.ListClients;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Tools;

[Authorize]
[McpServerToolType]
public sealed class ClientsTools(IDispatcher dispatcher)
{
    [McpServerTool(
        Name = "list_clients",
        Title = "Listar clientes",
        ReadOnly = true,
        Destructive = false,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(PagedResult<ClientListItemResponse>))]
    [Description(
        "Lista os clientes da empresa autenticada, com busca opcional, filtro de situação e paginação. " +
        "A busca por trecho vale para nome e e-mail e, quando o texto parece um CPF, também para o CPF, com ou sem máscara. " +
        "Ignora maiúsculas e minúsculas. Sem filtro de situação, retorna ativos e inativos; use status active para ver só os ativos. " +
        "Os resultados são ordenados por nome e, em caso de empate, por ID. " +
        "Cada item traz ID, nome, data de nascimento, telefone, e-mail, CPF, situação e etiquetas. " +
        "Retorna os itens, o total de clientes que correspondem aos filtros, a página e o tamanho da página. " +
        "Uma busca sem correspondência ou uma página além dos resultados retorna uma lista vazia. " +
        "Não informe usuário ou empresa como entrada.")]
    public async Task<CallToolResult> ListClients(
        [Description("Filtros opcionais de busca, situação e paginação dos clientes. Omita para usar a paginação padrão, sem filtro.")]
        ListClientsQuery? query = null,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Query(query ?? new ListClientsQuery(), cancellationToken);
        return result.ToToolResult();
    }

    [McpServerTool(
        Name = "get_client_by_id",
        Title = "Consultar cliente por ID",
        ReadOnly = true,
        Destructive = false,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(ClientResponse))]
    [Description(
        "Consulta um cliente da empresa autenticada pelo ID e retorna o cadastro completo: " +
        "nome, data de nascimento, telefone, e-mail, CPF, observações administrativas, situação, " +
        "responsáveis, contatos de referência com suas finalidades e etiquetas. " +
        "Use o ID retornado por list_clients. Se você só tiver o nome, o e-mail ou o CPF, use list_clients. " +
        "Um ID que não existe na empresa retorna não encontrado.")]
    public async Task<CallToolResult> GetClientById(
        [Description("Identificador do cliente a consultar.")]
        GetClientByIdQuery query,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Query(query, cancellationToken);
        return result.ToToolResult();
    }
}
