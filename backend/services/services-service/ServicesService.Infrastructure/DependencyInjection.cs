using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddServicesInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing 'ConnectionStrings:Default' configuration.");

        services.AddDbContext<ServicesDataContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped<ITagRepository, TagRepository>();

        return services;
    }
}
