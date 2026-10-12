using FluentValidation;

namespace ServicesService.Application.Clients.ListClients;

public sealed class ListClientsQueryValidator : AbstractValidator<ListClientsQuery>
{
    private const int MaxPageSize = 100;

    private static readonly string[] KnownStatuses =
    [
        ListClientsQuery.ActiveStatus,
        ListClientsQuery.InactiveStatus,
        ListClientsQuery.AllStatus,
    ];

    public ListClientsQueryValidator()
    {
        RuleFor(query => query.Page)
            .Cascade(CascadeMode.Stop)
            .GreaterThanOrEqualTo(1)
            .WithErrorCode("Client.PageInvalid")
            .WithMessage("A página deve ser maior ou igual a 1.")
            .Must((query, page) => (long)(page - 1) * query.PageSize <= int.MaxValue)
            .WithErrorCode("Client.PageTooLarge")
            .WithMessage("A página informada está além do limite permitido.");

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, MaxPageSize)
            .WithErrorCode("Client.PageSizeInvalid")
            .WithMessage($"O tamanho da página deve ser entre 1 e {MaxPageSize}.");

        RuleFor(query => query.Q)
            .MaximumLength(EmailAddress.MaxLength)
            .WithErrorCode("Client.SearchTooLong")
            .WithMessage($"A busca deve ter no máximo {EmailAddress.MaxLength} caracteres.");

        RuleFor(query => query.Status)
            .Must(status => string.IsNullOrWhiteSpace(status) || KnownStatuses.Contains(status, StringComparer.OrdinalIgnoreCase))
            .WithErrorCode("Client.StatusFilterInvalid")
            .WithMessage(
                $"A situação deve ser {ListClientsQuery.ActiveStatus}, {ListClientsQuery.InactiveStatus} ou {ListClientsQuery.AllStatus}.");
    }
}
