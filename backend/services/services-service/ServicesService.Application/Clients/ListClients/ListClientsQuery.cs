using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Clients.ListClients;

public sealed record ListClientsQuery(
    [property: Description("Trecho do nome, do e-mail ou do CPF do cliente, com ou sem máscara. Ignora maiúsculas e minúsculas. Ausente, vazio ou somente espaços não aplica filtro. Limite de 254 caracteres após remover espaços nas extremidades.")]
    SearchText? Search = null,
    [property: Description("Situação do cliente: active (somente ativos), inactive (somente inativos) ou all (todos). Ausente lista todos.")]
    ClientStatusFilter? Status = null) : PagedQuery, IQuery<PagedResult<ClientListItemResponse>>
{
    public ClientListFilter ToFilter()
    {
        var text = Search?.Value;
        var cpfDigits = CpfDigitsOf(text);
        var status = ToClientStatus(Status);

        return new ClientListFilter(Page, PageSize, text, cpfDigits, status);
    }

    private static string? CpfDigitsOf(string? text)
    {
        if (text is null)
        {
            return null;
        }

        var digits = CpfNumber.StripMask(text);
        if (digits.Length == 0 || digits.Length > CpfNumber.Length || !digits.All(char.IsAsciiDigit))
        {
            return null;
        }

        return digits;
    }

    private static ClientStatus? ToClientStatus(ClientStatusFilter? status)
    {
        if (status is null or ClientStatusFilter.All)
        {
            return null;
        }

        if (status == ClientStatusFilter.Inactive)
        {
            return ClientStatus.Inactive;
        }

        return ClientStatus.Active;
    }
}
