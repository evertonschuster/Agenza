using System.ComponentModel;
using System.Text.Json.Serialization;

namespace ServicesService.Application.Users.GetCurrentUser;

public sealed record CurrentUserResponse(
    [property: Description("Usuário da identidade autenticada nesta conexão.")] CurrentUserDetails User,
    [property: Description("Estabelecimento associado à identidade autenticada nesta conexão.")] CurrentUserTenant Tenant);

public sealed record CurrentUserDetails(
    [property: Description("ID do usuário. Nulo quando indisponível na identidade autenticada.")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] Guid? Id,
    [property: Description("Login do usuário; não representa necessariamente seu nome completo. Nulo quando indisponível.")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Username,
    [property: Description("E-mail informado na identidade autenticada. Sua presença não indica que foi verificado. Nulo quando indisponível.")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Email);

public sealed record CurrentUserTenant(
    [property: Description("ID do tenant autenticado. Identifica o estabelecimento desta conexão.")] Guid Id,
    [property: Description("Nome do estabelecimento informado na identidade autenticada. Nulo quando indisponível; isso não significa que o tenant não exista.")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Name);
