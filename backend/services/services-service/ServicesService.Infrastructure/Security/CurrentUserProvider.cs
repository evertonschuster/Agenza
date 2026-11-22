using Admin.Identity.Client;
using ServicesService.Application.Abstractions;

namespace ServicesService.Infrastructure.Security;

public sealed class CurrentUserProvider(
    ICurrentUserAccessor currentUserAccessor,
    ITenantAccessor tenantAccessor) : ICurrentUserProvider
{
    public Guid? UserId => currentUserAccessor.UserId;
    public string? Username => currentUserAccessor.Username;
    public string? Email => currentUserAccessor.Email;
    public Guid TenantId => tenantAccessor.TenantId;
    public string? TenantName => tenantAccessor.TenantName;
}
