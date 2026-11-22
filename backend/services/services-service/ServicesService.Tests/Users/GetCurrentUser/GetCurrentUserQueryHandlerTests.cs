using ServicesService.Application.Abstractions;
using ServicesService.Application.Users.GetCurrentUser;

namespace ServicesService.Tests.Users.GetCurrentUser;

public sealed class GetCurrentUserQueryHandlerTests
{
    [Fact]
    public async Task Consulta_retorna_usuario_e_tenant_do_contexto_atual()
    {
        var provider = Substitute.For<ICurrentUserProvider>();
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        provider.UserId.Returns(userId);
        provider.Username.Returns("maria");
        provider.Email.Returns("maria@exemplo.com");
        provider.TenantId.Returns(tenantId);
        provider.TenantName.Returns("Clínica Maria");
        var handler = new GetCurrentUserQueryHandler(provider);

        var result = await handler.Handle(new GetCurrentUserQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Should().Be(new CurrentUserDetails(userId, "maria", "maria@exemplo.com"));
        result.Value.Tenant.Should().Be(new CurrentUserTenant(tenantId, "Clínica Maria"));
    }

    [Fact]
    public async Task Consulta_preserva_campos_opcionais_ausentes()
    {
        var provider = Substitute.For<ICurrentUserProvider>();
        var tenantId = Guid.NewGuid();
        provider.Username.Returns((string?)null);
        provider.Email.Returns((string?)null);
        provider.TenantId.Returns(tenantId);
        provider.TenantName.Returns((string?)null);
        var handler = new GetCurrentUserQueryHandler(provider);

        var result = await handler.Handle(new GetCurrentUserQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Should().Be(new CurrentUserDetails(null, null, null));
        result.Value.Tenant.Should().Be(new CurrentUserTenant(tenantId, null));
    }
}
