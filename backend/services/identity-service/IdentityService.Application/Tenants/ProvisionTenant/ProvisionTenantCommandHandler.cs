using Admin.SharedKernel;
using IdentityService.Application.Abstractions;
using IdentityService.Domain.Entities;

namespace IdentityService.Application.Tenants.ProvisionTenant;

/// <summary>
/// Creates a new Business (Tenant) together with its single owner-operator
/// User. Matches the v1 domain model (docs/DOMAIN.md): one user, one
/// tenant, no self-service signup - this is invoked from a protected
/// internal endpoint or dev-time seeding, not a public form.
/// </summary>
public sealed class ProvisionTenantCommandHandler : ICommandHandler<ProvisionTenantCommand, ProvisionTenantResponse>
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserAccountService _userAccountService;
    private readonly IUnitOfWork _unitOfWork;

    public ProvisionTenantCommandHandler(
        ITenantRepository tenantRepository,
        IUserAccountService userAccountService,
        IUnitOfWork unitOfWork)
    {
        _tenantRepository = tenantRepository;
        _userAccountService = userAccountService;
        _unitOfWork = unitOfWork;
    }

    public Task<Result<ProvisionTenantResponse>> Handle(
        ProvisionTenantCommand command,
        CancellationToken cancellationToken)
    {
        // Owner creation can fail (duplicate email, weak password, ...)
        // after the tenant row is already written, so both writes run in
        // one transaction - a failed owner creation rolls the tenant back
        // too, instead of leaving an orphaned tenant with no owner. The
        // transaction is Result-aware (see IUnitOfWork): a Result.Failure
        // returned here rolls back exactly like a thrown exception would.
        return _unitOfWork.ExecuteInTransactionAsync<ProvisionTenantResponse>(async ct =>
        {
            // Domain construction can throw InvalidTenantException (a
            // BusinessException) if a caller bypasses
            // ProvisionTenantCommandValidator - left uncaught on purpose,
            // the Api's global exception handler maps it to a 400 Problem
            // Details response (docs/adr/0006).
            var tenant = new Tenant(Guid.CreateVersion7(), command.TenantName);

            await _tenantRepository.AddAsync(tenant, ct);

            var ownerResult = await _userAccountService.CreateOwnerAsync(
                tenant.Id,
                command.OwnerEmail,
                command.OwnerPassword,
                ct);

            if (ownerResult.IsFailure)
            {
                return Result.Failure<ProvisionTenantResponse>(ownerResult.Error);
            }

            return new ProvisionTenantResponse(tenant.Id, ownerResult.Value.UserId);
        }, cancellationToken);
    }
}
