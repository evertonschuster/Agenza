using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Users.GetCurrentUser;

public sealed class GetCurrentUserQueryHandler(ICurrentUserProvider currentUserProvider)
    : IQueryHandler<GetCurrentUserQuery, CurrentUserResponse>
{
    public Task<Result<CurrentUserResponse>> Handle(GetCurrentUserQuery query, CancellationToken cancellationToken)
    {
        var user = new CurrentUserDetails(
            currentUserProvider.UserId,
            currentUserProvider.Username,
            currentUserProvider.Email);

        var tenant = new CurrentUserTenant(
            currentUserProvider.TenantId,
            currentUserProvider.TenantName);

        var response = new CurrentUserResponse(user, tenant);
        return Task.FromResult(Result.Success(response));
    }
}
