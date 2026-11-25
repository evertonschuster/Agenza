using System.ComponentModel;
using Admin.SharedKernel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application.Clients;
using ServicesService.Application.Clients.CreateClient;
using ServicesService.Application.Clients.DeactivateClient;
using ServicesService.Application.Clients.GetClientById;
using ServicesService.Application.Clients.ListClients;
using ServicesService.Application.Clients.ReactivateClient;
using ServicesService.Application.Clients.UpdateClient;
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

    [McpServerTool(
        Name = "create_client",
        Title = "Criar cliente",
        ReadOnly = false,
        Destructive = false,
        Idempotent = false,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(ClientResponse))]
    [Description(
        "Cria um cliente na empresa autenticada e retorna o cadastro criado, com o ID. " +
        "Só o nome completo é obrigatório; omita os campos que você não tiver, sem inventar dados. " +
        "Cada chamada bem-sucedida cria um novo cliente: esta ferramenta não é idempotente e não deve ser repetida para o mesmo cadastro. " +
        "Antes de criar, procure o cliente com list_clients (por nome, e-mail ou CPF) para não duplicar. " +
        "Um CPF já cadastrado, ou um e-mail já usado por cliente ativo, retorna conflito com o ID do cliente existente em fieldErrors; " +
        "consulte-o com get_client_by_id. Sem CPF e sem e-mail, o sistema não detecta duplicidade. " +
        "Menores de 18 anos exigem ao menos um responsável. " +
        "Para etiquetas, use os IDs retornados por list_tags.")]
    public async Task<CallToolResult> CreateClient(
        [Description("Dados do cliente a criar.")]
        CreateClientCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Send(command, cancellationToken);
        return result.ToToolResult();
    }

    [McpServerTool(
        Name = "update_client",
        Title = "Editar cliente",
        ReadOnly = false,
        Destructive = true,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(ClientResponse))]
    [Description(
        "Edita um cliente da empresa autenticada e retorna o cadastro salvo. " +
        "A edição substitui o cadastro inteiro: envie o ID e os valores finais de todos os campos. " +
        "Antes de editar, consulte o cliente com get_client_by_id e repita os valores atuais dos campos que não mudam; " +
        "se você só tiver o nome, o e-mail ou o CPF, comece com list_clients. " +
        "Um campo enviado como null, ou omitido, fica vazio, e uma lista vazia, nula ou omitida em guardians, referenceContacts " +
        "ou tagIds remove todos os itens atuais, então envie sempre todos os campos e todos os itens que devem permanecer. " +
        "A situação (ativo ou inativo) não muda por esta ferramenta. " +
        "Um CPF já cadastrado em outro cliente, ou um e-mail já usado por outro cliente ativo, retorna conflito com o ID " +
        "do outro cliente em fieldErrors. " +
        "Menores de 18 anos exigem ao menos um responsável. Para etiquetas, use os IDs retornados por list_tags. " +
        "Se a pessoa for editada ao mesmo tempo em outro lugar, vale a última gravação.")]
    public async Task<CallToolResult> UpdateClient(
        [Description("ID do cliente e valores finais de todos os campos editáveis.")]
        UpdateClientCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Send(command, cancellationToken);
        return result.ToToolResult();
    }

    [McpServerTool(
        Name = "deactivate_client",
        Title = "Desativar cliente",
        ReadOnly = false,
        Destructive = false,
        Idempotent = true,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(ClientResponse))]
    [Description(
        "Desativa um cliente da empresa autenticada, mudando a situação para inativo, e retorna o cadastro atualizado. " +
        "O cadastro e o histórico são preservados e a operação é reversível. " +
        "Use o ID retornado por list_clients ou get_client_by_id; se você só tiver o nome, o e-mail ou o CPF, use list_clients. " +
        "Desativar um cliente que já está inativo não altera nada e retorna o cadastro atual. " +
        "A desativação é recusada com conflito (Client.HasUpcomingAppointments) quando o cliente tem agendamentos futuros " +
        "não cancelados; nesse caso, informe o usuário, porque esses agendamentos precisam ser resolvidos antes. " +
        "Um cliente inativo deixa de bloquear o uso do seu e-mail por outro cliente ativo. " +
        "Desative apenas quando o usuário pedir explicitamente.")]
    public async Task<CallToolResult> DeactivateClient(
        [Description("ID do cliente a desativar.")]
        DeactivateClientCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Send(command, cancellationToken);
        return result.ToToolResult();
    }

    [McpServerTool(
        Name = "reactivate_client",
        Title = "Reativar cliente",
        ReadOnly = false,
        Destructive = false,
        Idempotent = true,
        OpenWorld = false,
        UseStructuredContent = true,
        OutputSchemaType = typeof(ClientResponse))]
    [Description(
        "Reativa um cliente inativo da empresa autenticada, mudando a situação para ativo, e retorna o cadastro atualizado. " +
        "Use o ID retornado por list_clients ou get_client_by_id; se você só tiver o nome, o e-mail ou o CPF, use list_clients " +
        "com status inactive. " +
        "Reativar um cliente que já está ativo não altera nada e retorna o cadastro atual. " +
        "A reativação é recusada com conflito quando o CPF do cliente já é usado por outra pessoa (Client.DuplicateCpf) " +
        "ou o e-mail já é usado por outra pessoa ativa (Client.DuplicateEmail); o ID e o nome da outra pessoa vêm em fieldErrors. " +
        "Nesse caso, informe o usuário e, se ele pedir, corrija o CPF ou o e-mail deste cadastro com update_client " +
        "antes de tentar de novo. " +
        "Reative apenas quando o usuário pedir explicitamente.")]
    public async Task<CallToolResult> ReactivateClient(
        [Description("ID do cliente a reativar.")]
        ReactivateClientCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await dispatcher.Send(command, cancellationToken);
        return result.ToToolResult();
    }
}
