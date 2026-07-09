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
    private readonly IUnitOfWork _unitOfWork;

    public ProvisionTenantUseCase(
        ITenantRepository tenantRepository,
        IUserAccountService userAccountService,
        IUnitOfWork unitOfWork)
    {
        _tenantRepository = tenantRepository;
        _userAccountService = userAccountService;
        _unitOfWork = unitOfWork;
    }

    public async Task<ProvisionTenantResult> ExecuteAsync(
        ProvisionTenantRequest request,
        CancellationToken cancellationToken)
    {
        ProvisionTenantResult? result = null;

        // Owner creation can fail (duplicate email, weak password, ...)
        // after the tenant row is already written, so both writes run in
        // one transaction - a failed owner creation rolls the tenant back
        // too, instead of leaving an orphaned tenant with no owner.
        await _unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var tenant = new Tenant(Guid.NewGuid(), request.TenantName);
            await _tenantRepository.AddAsync(tenant, ct);

            var owner = await _userAccountService.CreateOwnerAsync(
                tenant.Id,
                request.OwnerEmail,
                request.OwnerPassword,
                ct);

            result = new ProvisionTenantResult(tenant.Id, owner.UserId);
        }, cancellationToken);

        return result!;
    }
}
