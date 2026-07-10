using System.Reflection;
using Admin.SharedKernel;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ServicesService.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddServicesApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddValidatorsFromAssembly(assembly);
        services.AddHandlersFromAssembly(assembly);

        return services;
    }
}
