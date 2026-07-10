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
            Tenant tenant;
            try
            {
                tenant = new Tenant(IdGenerator.NewId(), command.TenantName);
            }
            catch (ArgumentException exception)
            {
                // Reached only if a caller bypasses ProvisionTenantCommandValidator
                // - the validator already rejects a blank name before this
                // handler runs. Domain stays exception-based (zero deps,
                // docs/adr/0005); the Application boundary still never
                // lets one escape as an exception.
                return Result.Failure<ProvisionTenantResponse>(Error.Validation("Tenant.Invalid", exception.Message));
            }

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
