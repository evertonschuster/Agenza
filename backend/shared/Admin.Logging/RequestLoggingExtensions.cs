using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.Logging;

public static class RequestLoggingExtensions
{
    public static IServiceCollection AddRequestLogging(this IServiceCollection services, params string[] quietPaths)
    {
        services.AddTransient<IStartupFilter>(provider => new RequestLoggingStartupFilter(
            provider.GetRequiredService<Serilog.ILogger>(),
            quietPaths));

        return services;
    }
}
