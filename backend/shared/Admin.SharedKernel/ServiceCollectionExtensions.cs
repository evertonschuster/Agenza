using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel;

public static class ServiceCollectionExtensions
{
    /// <summary>Registers the dispatcher. See AddHandlersFromAssembly for handlers themselves.</summary>
    public static IServiceCollection AddSharedKernel(this IServiceCollection services)
    {
        services.AddScoped<IDispatcher, Dispatcher>();
        return services;
    }

    /// <summary>
    /// Scans <paramref name="assembly"/> for classes implementing
    /// ICommandHandler&lt;&gt;/ICommandHandler&lt;,&gt;/IQueryHandler&lt;,&gt; and registers
    /// each as Scoped against the interface it implements. Call this from
    /// each service's own Application-layer DI extension (e.g.
    /// AddServicesApplication) so adding a new vertical slice's handler
    /// just works - no per-handler line to remember in Program.cs.
    /// </summary>
    public static IServiceCollection AddHandlersFromAssembly(this IServiceCollection services, Assembly assembly)
    {
        var handlerInterfaceDefinitions = new[]
        {
            typeof(ICommandHandler<>),
            typeof(ICommandHandler<,>),
            typeof(IQueryHandler<,>),
        };

        var concreteTypes = assembly.GetTypes().Where(type => type is { IsClass: true, IsAbstract: false });

        foreach (var type in concreteTypes)
        {
            var handlerInterfaces = type.GetInterfaces()
                .Where(i => i.IsGenericType && handlerInterfaceDefinitions.Contains(i.GetGenericTypeDefinition()));

            foreach (var handlerInterface in handlerInterfaces)
            {
                services.AddScoped(handlerInterface, type);
            }
        }

        return services;
    }
}
