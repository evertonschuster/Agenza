using Admin.SharedKernel;
using IdentityService.Application.Abstractions;
using IdentityService.Application.Tenants.ProvisionTenant;
using IdentityService.Domain.Entities;

namespace IdentityService.Tests.Tenants.ProvisionTenant;

public class ProvisionTenantCommandHandlerTests
{
    private class FakeTenantRepository : ITenantRepository
    {
        public List<Tenant> Tenants { get; } = [];

        public Task<Tenant?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken) =>
            Task.FromResult(Tenants.FirstOrDefault(t => t.Id == tenantId));

        public Task AddAsync(Tenant tenant, CancellationToken cancellationToken)
        {
            Tenants.Add(tenant);
            return Task.CompletedTask;
        }
    }

    private class FakeUserAccountService : IUserAccountService
    {
        public List<(Guid TenantId, string Email)> CreatedOwners { get; } = [];

        public Task<Result<UserAccountResult>> CreateOwnerAsync(
            Guid tenantId,
            string email,
            string password,
            CancellationToken cancellationToken)
        {
            CreatedOwners.Add((tenantId, email));
            return Task.FromResult(Result.Success(new UserAccountResult(Guid.NewGuid(), email)));
        }
    }

    private class FailingUserAccountService : IUserAccountService
    {
        public Task<Result<UserAccountResult>> CreateOwnerAsync(
            Guid tenantId,
            string email,
            string password,
            CancellationToken cancellationToken) =>
            Task.FromResult(Result.Failure<UserAccountResult>(
                Error.Validation("Owner.CreationFailed", "Simulated owner creation failure.")));
    }

    // Just runs the operation directly - real rollback-on-failure is
    // exercised against a real Postgres transaction by UnitOfWork, which
    // fakes can't meaningfully simulate (see IdentityService.IntegrationTests).
    private class FakeUnitOfWork : IUnitOfWork
    {
        public Task<Result<TResult>> ExecuteInTransactionAsync<TResult>(
            Func<CancellationToken, Task<Result<TResult>>> operation,
            CancellationToken cancellationToken) =>
            operation(cancellationToken);
    }

    [Fact]
    public async Task Handle_WithValidCommand_CreatesTenantAndOwnerUser()
    {
        var tenantRepository = new FakeTenantRepository();
        var userAccountService = new FakeUserAccountService();
        var handler = new ProvisionTenantCommandHandler(tenantRepository, userAccountService, new FakeUnitOfWork());

        var result = await handler.Handle(
            new ProvisionTenantCommand("Demo Business", "owner@demo.local", "Passw0rd!"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        tenantRepository.Tenants.Should().ContainSingle().Which.Name.Should().Be("Demo Business");
        result.Value.TenantId.Should().Be(tenantRepository.Tenants[0].Id);
        userAccountService.CreatedOwners.Should().ContainSingle(owner =>
            owner.TenantId == result.Value.TenantId && owner.Email == "owner@demo.local");
    }

    [Fact]
    public async Task Handle_WhenOwnerCreationFails_ReturnsTheFailure()
    {
        var tenantRepository = new FakeTenantRepository();
        var handler = new ProvisionTenantCommandHandler(
            tenantRepository,
            new FailingUserAccountService(),
            new FakeUnitOfWork());

        var result = await handler.Handle(
            new ProvisionTenantCommand("Demo Business", "owner@demo.local", "Passw0rd!"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Owner.CreationFailed");
    }

    [Fact]
    public void Command_ToString_RedactsThePassword()
    {
        var command = new ProvisionTenantCommand("Demo Business", "owner@demo.local", "super-secret");

        command.ToString().Should().NotContain("super-secret").And.Contain("[REDACTED]");
    }
}
