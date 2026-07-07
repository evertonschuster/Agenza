using IdentityService.Application.Abstractions;
using IdentityService.Application.UseCases.ProvisionTenant;
using IdentityService.Domain.Entities;

namespace IdentityService.Tests;

public class ProvisionTenantUseCaseTests
{
    private class FakeTenantRepository : ITenantRepository
    {
        public List<Tenant> Tenants { get; } = new();

        public Task<Tenant?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken)
            => Task.FromResult(Tenants.FirstOrDefault(t => t.Id == tenantId));

        public Task AddAsync(Tenant tenant, CancellationToken cancellationToken)
        {
            Tenants.Add(tenant);
            return Task.CompletedTask;
        }
    }

    private class FakeUserAccountService : IUserAccountService
    {
        public List<(Guid TenantId, string Email)> CreatedOwners { get; } = new();

        public Task<UserAccountResult> CreateOwnerAsync(
            Guid tenantId,
            string email,
            string password,
            CancellationToken cancellationToken)
        {
            CreatedOwners.Add((tenantId, email));
            return Task.FromResult(new UserAccountResult(Guid.NewGuid(), email));
        }
    }

    private class ThrowingUserAccountService : IUserAccountService
    {
        public Task<UserAccountResult> CreateOwnerAsync(
            Guid tenantId,
            string email,
            string password,
            CancellationToken cancellationToken)
            => throw new InvalidOperationException("Simulated owner creation failure.");
    }

    // Just runs the operation directly - real rollback-on-failure is
    // exercised against a real Postgres transaction by UnitOfWork, which
    // fakes can't meaningfully simulate.
    private class FakeUnitOfWork : IUnitOfWork
    {
        public Task ExecuteInTransactionAsync(
            Func<CancellationToken, Task> operation,
            CancellationToken cancellationToken)
            => operation(cancellationToken);
    }

    [Fact]
    public async Task ExecuteAsync_CreatesTenantAndOwnerUser()
    {
        var tenantRepository = new FakeTenantRepository();
        var userAccountService = new FakeUserAccountService();
        var useCase = new ProvisionTenantUseCase(tenantRepository, userAccountService, new FakeUnitOfWork());

        var result = await useCase.ExecuteAsync(
            new ProvisionTenantRequest("Demo Business", "owner@demo.local", "Passw0rd!"),
            CancellationToken.None);

        Assert.Single(tenantRepository.Tenants);
        Assert.Equal("Demo Business", tenantRepository.Tenants[0].Name);
        Assert.Equal(result.TenantId, tenantRepository.Tenants[0].Id);

        Assert.Single(userAccountService.CreatedOwners);
        Assert.Equal(result.TenantId, userAccountService.CreatedOwners[0].TenantId);
        Assert.Equal("owner@demo.local", userAccountService.CreatedOwners[0].Email);
    }

    [Fact]
    public async Task ExecuteAsync_PropagatesOwnerCreationFailure()
    {
        var tenantRepository = new FakeTenantRepository();
        var useCase = new ProvisionTenantUseCase(
            tenantRepository,
            new ThrowingUserAccountService(),
            new FakeUnitOfWork());

        await Assert.ThrowsAsync<InvalidOperationException>(() => useCase.ExecuteAsync(
            new ProvisionTenantRequest("Demo Business", "owner@demo.local", "Passw0rd!"),
            CancellationToken.None));
    }
}
