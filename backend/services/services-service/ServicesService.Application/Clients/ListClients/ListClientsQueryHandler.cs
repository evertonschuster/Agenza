using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.ListClients;

public sealed class ListClientsQueryHandler(IClientRepository clientRepository)
    : IQueryHandler<ListClientsQuery, PagedResult<ClientListItemResponse>>
{
    public async Task<Result<PagedResult<ClientListItemResponse>>> Handle(
        ListClientsQuery query,
        CancellationToken cancellationToken)
    {
        var text = TextOf(query.Q);
        var cpfDigits = ExtractCpfDigits(text);
        var status = ToStatusFilter(query.Status);

        var page = new PageRequest(query.Page, query.PageSize);

        var clients = await clientRepository.ListAsync(page, text, cpfDigits, status, cancellationToken);

        return Result.Success(clients.Map(ClientListItemResponse.FromClient));
    }

    private static string? TextOf(SearchText? search)
    {
        if (search is null || search.IsEmpty)
        {
            return null;
        }

        return search.Value;
    }

    private static string? ExtractCpfDigits(string? text)
    {
        if (text is null)
        {
            return null;
        }

        var digits = new string(text.Where(character => character is not ('.' or '-') && !char.IsWhiteSpace(character)).ToArray());
        if (digits.Length == 0 || !digits.All(char.IsAsciiDigit))
        {
            return null;
        }

        return digits;
    }

    private static ClientStatus? ToStatusFilter(ClientStatusFilter? status)
    {
        if (status == ClientStatusFilter.All)
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
