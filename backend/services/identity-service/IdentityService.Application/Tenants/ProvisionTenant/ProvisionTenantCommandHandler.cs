using Admin.SharedKernel;
using IdentityService.Application.Abstractions;
using IdentityService.Domain.Entities;

namespace IdentityService.Application.Tenants.ProvisionTenant;

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
        // Both writes run in one transaction so a failed owner creation rolls the tenant back too, instead of leaving it orphaned.
        return _unitOfWork.ExecuteInTransactionAsync<ProvisionTenantResponse>(async ct =>
        {
            var tenantResult = Tenant.Create(Guid.CreateVersion7(), command.TenantName);

            if (tenantResult.IsFailure)
            {
                return Result.Failure<ProvisionTenantResponse>(tenantResult.Error.ToApplicationError());
            }

            var tenant = tenantResult.Value;

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
