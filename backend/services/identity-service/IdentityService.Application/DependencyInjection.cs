using System.Reflection;
using Admin.SharedKernel;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace IdentityService.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Registers every command/query handler and FluentValidation
    /// validator in this assembly by scanning, not by listing each one -
    /// adding a new vertical slice needs no change here.
    /// </summary>
    public static IServiceCollection AddIdentityApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddValidatorsFromAssembly(assembly);
        services.AddHandlersFromAssembly(assembly);

        return services;
    }
}
