using Admin.SharedKernel;
using ServicesService.Application.Users.GetCurrentUser;

namespace ServicesService.Tests.Users.GetCurrentUser;

public sealed class GetCurrentUserQueryHandlerTests
{
    [Fact]
    public async Task Consulta_retorna_usuario_e_tenant_do_contexto_atual()
    {
        var currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
        var tenantAccessor = Substitute.For<ITenantAccessor>();
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        currentUserAccessor.UserId.Returns(userId);
        currentUserAccessor.Username.Returns("maria");
        currentUserAccessor.Email.Returns("maria@exemplo.com");
        tenantAccessor.TenantId.Returns(tenantId);
        tenantAccessor.TenantName.Returns("Clínica Maria");
        var handler = new GetCurrentUserQueryHandler(currentUserAccessor, tenantAccessor);

        var result = await handler.Handle(new GetCurrentUserQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Should().Be(new CurrentUserDetails(userId, "maria", "maria@exemplo.com"));
        result.Value.Tenant.Should().Be(new CurrentUserTenant(tenantId, "Clínica Maria"));
    }

    [Fact]
    public async Task Consulta_preserva_campos_opcionais_ausentes()
    {
        var currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
        var tenantAccessor = Substitute.For<ITenantAccessor>();
        var tenantId = Guid.NewGuid();
        currentUserAccessor.Username.Returns((string?)null);
        currentUserAccessor.Email.Returns((string?)null);
        tenantAccessor.TenantId.Returns(tenantId);
        tenantAccessor.TenantName.Returns((string?)null);
        var handler = new GetCurrentUserQueryHandler(currentUserAccessor, tenantAccessor);

        var result = await handler.Handle(new GetCurrentUserQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.User.Should().Be(new CurrentUserDetails(null, null, null));
        result.Value.Tenant.Should().Be(new CurrentUserTenant(tenantId, null));
    }
}
