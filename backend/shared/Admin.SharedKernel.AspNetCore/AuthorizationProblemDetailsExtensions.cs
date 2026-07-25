using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel.AspNetCore;

public static class AuthorizationProblemDetailsExtensions
{
    public static IServiceCollection AddAuthorizationProblemDetails(
        this IServiceCollection services)
    {
        services.AddSingleton<
            Microsoft.AspNetCore.Authorization.IAuthorizationMiddlewareResultHandler,
            ProblemDetailsAuthorizationMiddlewareResultHandler>();
        return services;
    }
}
