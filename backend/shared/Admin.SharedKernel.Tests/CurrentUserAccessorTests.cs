using System.Security.Claims;
using Admin.Identity.Client;
using Microsoft.AspNetCore.Http;

namespace Admin.SharedKernel.Tests;

public sealed class CurrentUserAccessorTests
{
    [Fact]
    public void Usuario_autenticado_disponibiliza_login_e_email_das_claims()
    {
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim("name", "maria"), new Claim("email", "maria@exemplo.com")], "Bearer")),
        };
        var accessor = new HttpContextCurrentUserAccessor(new HttpContextAccessor { HttpContext = context });

        accessor.IsAuthenticated.Should().BeTrue();
        accessor.Username.Should().Be("maria");
        accessor.Email.Should().Be("maria@exemplo.com");
    }

    [Theory]
    [InlineData("maria", null)]
    [InlineData(null, "maria@exemplo.com")]
    [InlineData(null, null)]
    public void Claims_opcionais_ausentes_nao_impedem_identificar_autenticacao(string? username, string? email)
    {
        var claims = new List<Claim>();
        if (username is not null)
        {
            claims.Add(new Claim("name", username));
        }

        if (email is not null)
        {
            claims.Add(new Claim("email", email));
        }

        var context = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer")) };
        var accessor = new HttpContextCurrentUserAccessor(new HttpContextAccessor { HttpContext = context });

        accessor.IsAuthenticated.Should().BeTrue();
        accessor.Username.Should().Be(username);
        accessor.Email.Should().Be(email);
    }

    [Fact]
    public void Usuario_nao_autenticado_nao_disponibiliza_login_ou_email()
    {
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim("name", "maria"), new Claim("email", "maria@exemplo.com")])),
        };
        var accessor = new HttpContextCurrentUserAccessor(new HttpContextAccessor { HttpContext = context });

        accessor.IsAuthenticated.Should().BeFalse();
        accessor.Username.Should().BeNull();
        accessor.Email.Should().BeNull();
    }

    [Fact]
    public void Sem_requisicao_nao_ha_usuario_autenticado()
    {
        var accessor = new HttpContextCurrentUserAccessor(new HttpContextAccessor());

        accessor.IsAuthenticated.Should().BeFalse();
        accessor.UserId.Should().BeNull();
        accessor.Username.Should().BeNull();
        accessor.Email.Should().BeNull();
    }
}
