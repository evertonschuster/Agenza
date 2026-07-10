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
            // Left uncaught on purpose - the Api's global exception handler maps InvalidTenantException to a 400 (docs/adr/0006).
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
