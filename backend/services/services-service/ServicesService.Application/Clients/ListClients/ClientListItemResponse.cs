namespace ServicesService.Application.Clients.ListClients;

public sealed record ClientListItemResponse(
    Guid Id,
    string FullName,
    DateOnly? BirthDate,
    string? Phone,
    string? Email,
    string? Cpf,
    string Status)
{
    public static ClientListItemResponse FromClient(Client client)
    {
        return new ClientListItemResponse(
            client.Id,
            client.FullName.Value,
            client.BirthDate?.Value,
            client.Phone?.Value,
            client.Email?.Value,
            client.Cpf?.Value,
            client.Status.ToString().ToLowerInvariant());
    }
}
