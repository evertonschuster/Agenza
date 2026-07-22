using Admin.SharedKernel;
using IdentityService.Application.Abstractions;
using IdentityService.Application.Tenants;
using IdentityService.Application.Tenants.ProvisionTenant;
using IdentityService.Domain.Entities;

namespace IdentityService.Tests.Tenants.ProvisionTenant;

public class ProvisionTenantCommandHandlerTests
{
    private static IUnitOfWork CreatePassthroughUnitOfWork()
    {
        // This passthrough doesn't exercise real transactional rollback against
        // Postgres - that has no automated coverage since docs/adr/0015 removed
        // integration tests; verify manually if this handler's transaction logic changes.
        var unitOfWork = Substitute.For<IUnitOfWork>();
        unitOfWork
            .ExecuteInTransactionAsync(
                Arg.Any<Func<CancellationToken, Task<Result<ProvisionTenantResponse>>>>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<CancellationToken, Task<Result<ProvisionTenantResponse>>>>()(
                callInfo.Arg<CancellationToken>()));

        return unitOfWork;
    }

    [Fact]
    public async Task Handle_WithValidCommand_CreatesTenantAndOwnerUser()
    {
        var tenantRepository = Substitute.For<ITenantRepository>();
        var userAccountService = Substitute.For<IUserAccountService>();
        userAccountService
            .CreateOwnerAsync(Arg.Any<Guid>(), "owner@demo.local", "Passw0rd!", Arg.Any<CancellationToken>())
            .Returns(Result.Success(new UserAccountResult(Guid.NewGuid(), "owner@demo.local")));
        var handler = new ProvisionTenantCommandHandler(
            tenantRepository,
            userAccountService,
            CreatePassthroughUnitOfWork());

        var result = await handler.Handle(
            new ProvisionTenantCommand("Demo Business", "owner@demo.local", "Passw0rd!"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        await tenantRepository.Received(1).AddAsync(
            Arg.Is<Tenant>(tenant => tenant.Name == "Demo Business"),
            Arg.Any<CancellationToken>());
        await userAccountService.Received(1).CreateOwnerAsync(
            result.Value.TenantId,
            "owner@demo.local",
            "Passw0rd!",
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenOwnerCreationFails_ReturnsTheFailure()
    {
        var tenantRepository = Substitute.For<ITenantRepository>();
        var userAccountService = Substitute.For<IUserAccountService>();
        userAccountService
            .CreateOwnerAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Result.Failure<UserAccountResult>(
                Error.Validation("Owner.CreationFailed", "Simulated owner creation failure.")));
        var handler = new ProvisionTenantCommandHandler(
            tenantRepository,
            userAccountService,
            CreatePassthroughUnitOfWork());

        var result = await handler.Handle(
            new ProvisionTenantCommand("Demo Business", "owner@demo.local", "Passw0rd!"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Owner.CreationFailed");
    }

    [Fact]
    public async Task Handle_WithBlankTenantName_ReturnsFailure()
    {
        // Only reachable if a caller bypasses ProvisionTenantCommandValidator.
        var tenantRepository = Substitute.For<ITenantRepository>();
        var handler = new ProvisionTenantCommandHandler(
            tenantRepository,
            Substitute.For<IUserAccountService>(),
            CreatePassthroughUnitOfWork());

        var result = await handler.Handle(
            new ProvisionTenantCommand("", "owner@demo.local", "Passw0rd!"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Tenant.Invalid");
        await tenantRepository.DidNotReceive().AddAsync(Arg.Any<Tenant>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public void Command_ToString_RedactsThePassword()
    {
        var command = new ProvisionTenantCommand("Demo Business", "owner@demo.local", "super-secret");

        command.ToString().Should().NotContain("super-secret").And.Contain("[REDACTED]");
    }
}
