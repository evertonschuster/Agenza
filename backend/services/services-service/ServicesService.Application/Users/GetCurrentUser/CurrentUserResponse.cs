using System.Text.Json.Serialization;

namespace ServicesService.Application.Users.GetCurrentUser;

public sealed record CurrentUserResponse(CurrentUserDetails User, CurrentUserTenant Tenant);

public sealed record CurrentUserDetails(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] Guid? Id,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Username,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Email);

public sealed record CurrentUserTenant(
    Guid Id,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Name);
