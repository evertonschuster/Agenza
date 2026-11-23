using Admin.SharedKernel;

namespace ServicesService.Application.Users.GetCurrentUser;

public sealed class GetCurrentUserQueryHandler(
    ICurrentUserAccessor currentUserAccessor,
    ITenantAccessor tenantAccessor)
    : IQueryHandler<GetCurrentUserQuery, CurrentUserResponse>
{
    public Task<Result<CurrentUserResponse>> Handle(GetCurrentUserQuery query, CancellationToken cancellationToken)
    {
        var user = new CurrentUserDetails(
            currentUserAccessor.UserId,
            currentUserAccessor.Username,
            currentUserAccessor.Email);

        var tenant = new CurrentUserTenant(
            tenantAccessor.TenantId,
            tenantAccessor.TenantName);

        var response = new CurrentUserResponse(user, tenant);
        return Task.FromResult(Result.Success(response));
    }
}
