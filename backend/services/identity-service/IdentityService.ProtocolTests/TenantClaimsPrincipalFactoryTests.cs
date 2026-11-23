using IdentityService.Application.Abstractions;
using IdentityService.Domain.Entities;
using IdentityService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace IdentityService.ProtocolTests;

public sealed class TenantClaimsPrincipalFactoryTests
{
    [Theory]
    [InlineData("Clínica Maria")]
    [InlineData(null)]
    public async Task Identidade_carrega_nome_do_tenant_do_usuario_quando_cadastrado(string? tenantName)
    {
        var user = new ApplicationUser { Id = Guid.NewGuid(), TenantId = Guid.NewGuid() };
        var users = Substitute.For<UserManager<ApplicationUser>>(
            Substitute.For<IUserStore<ApplicationUser>>(), null, null, null, null, null, null, null, null);
        users.GetUserIdAsync(user).Returns(user.Id.ToString());
        users.GetUserNameAsync(user).Returns("maria");
        var roles = Substitute.For<RoleManager<IdentityRole<Guid>>>(
            Substitute.For<IRoleStore<IdentityRole<Guid>>>(), null, null, null, null);
        var tenants = Substitute.For<ITenantRepository>();
        tenants.GetByIdAsync(user.TenantId, Arg.Any<CancellationToken>())
            .Returns(tenantName is null ? null : Tenant.Create(user.TenantId, tenantName).Value);
        var options = new IdentityOptions();
        options.ClaimsIdentity.UserIdClaimType = "sub";
        var factory = new TenantClaimsPrincipalFactory(users, roles, Options.Create(options), tenants);

        var principal = await factory.CreateAsync(user);

        principal.FindFirst("tenant_id")!.Value.Should().Be(user.TenantId.ToString());
        (principal.FindFirst("tenant_name")?.Value).Should().Be(tenantName);
        await tenants.Received(1).GetByIdAsync(user.TenantId, Arg.Any<CancellationToken>());
    }
}
