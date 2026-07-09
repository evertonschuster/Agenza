using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.SharedKernel.Tests;

public class ServiceCollectionExtensionsTests
{
    private sealed record Ping(string Message) : ICommand<string>;

    private sealed class PingHandler : ICommandHandler<Ping, string>
    {
        public Task<Result<string>> Handle(Ping command, CancellationToken cancellationToken) =>
            Task.FromResult(Result.Success(command.Message));
    }

    private sealed record Archive(Guid Id) : ICommand;

    private sealed class ArchiveHandler : ICommandHandler<Archive>
    {
        public Task<Result> Handle(Archive command, CancellationToken cancellationToken) =>
            Task.FromResult(Result.Success());
    }

    private sealed record CountTenants(Guid TenantId) : IQuery<int>;

    private sealed class CountTenantsHandler : IQueryHandler<CountTenants, int>
    {
        public Task<Result<int>> Handle(CountTenants query, CancellationToken cancellationToken) =>
            Task.FromResult(Result.Success(1));
    }

    [Fact]
    public void AddSharedKernel_RegistersTheDispatcher()
    {
        var services = new ServiceCollection().AddSharedKernel();

        using var provider = services.BuildServiceProvider();

        provider.GetService<IDispatcher>().Should().BeOfType<Dispatcher>();
    }

    [Fact]
    public void AddHandlersFromAssembly_RegistersEveryHandlerShapeItFinds()
    {
        var services = new ServiceCollection()
            .AddHandlersFromAssembly(Assembly.GetExecutingAssembly());

        using var provider = services.BuildServiceProvider();

        provider.GetService<ICommandHandler<Ping, string>>().Should().BeOfType<PingHandler>();
        provider.GetService<ICommandHandler<Archive>>().Should().BeOfType<ArchiveHandler>();
        provider.GetService<IQueryHandler<CountTenants, int>>().Should().BeOfType<CountTenantsHandler>();
    }
}
