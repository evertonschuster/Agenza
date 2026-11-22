using System.Text.Json.Serialization;

namespace ServicesService.Mcp.Tools;

public sealed record CurrentIdentityResponse(CurrentIdentityUser User, CurrentIdentityTenant Tenant);

public sealed record CurrentIdentityUser(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] Guid? Id,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Username,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Email);

public sealed record CurrentIdentityTenant(
    Guid Id,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string? Name);
