using IdentityService.Application.Abstractions;
using IdentityService.Domain.Entities;

namespace IdentityService.Application.UseCases.ProvisionTenant;

/// <summary>
/// Creates a new Business (Tenant) together with its single owner-operator
/// User. Matches the v1 domain model (docs/DOMAIN.md): one user, one
/// tenant, no self-service signup - this is invoked from a protected
/// internal endpoint or dev-time seeding, not a public form.
/// </summary>
public class ProvisionTenantUseCase
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserAccountService _userAccountService;

    public ProvisionTenantUseCase(ITenantRepository tenantRepository, IUserAccountService userAccountService)
    {
        _tenantRepository = tenantRepository;
        _userAccountService = userAccountService;
    }

    public async Task<ProvisionTenantResult> ExecuteAsync(
        ProvisionTenantRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = new Tenant(Guid.NewGuid(), request.TenantName);
        await _tenantRepository.AddAsync(tenant, cancellationToken);

        var owner = await _userAccountService.CreateOwnerAsync(
            tenant.Id,
            request.OwnerEmail,
            request.OwnerPassword,
            cancellationToken);

        return new ProvisionTenantResult(tenant.Id, owner.UserId);
    }
}
