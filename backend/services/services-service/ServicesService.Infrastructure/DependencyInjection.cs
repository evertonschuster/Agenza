using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Persistence.Interceptors;
using ServicesService.Infrastructure.Repositories;
using ServicesService.Infrastructure.Security;

namespace ServicesService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddServicesInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing 'ConnectionStrings:Default' configuration.");

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<AuditableEntitySaveChangesInterceptor>();
        services.AddScoped<ICurrentTenantProvider, CurrentTenantProvider>();

        services.AddDbContext<ServicesDataContext>((serviceProvider, options) =>
            options
                .UseNpgsql(connectionString)
                .AddInterceptors(serviceProvider.GetRequiredService<AuditableEntitySaveChangesInterceptor>()));

        services.AddScoped<ITagRepository, TagRepository>();
        services.AddScoped<IServiceRepository, ServiceRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IServiceCodeGenerator, ServiceCodeGenerator>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
