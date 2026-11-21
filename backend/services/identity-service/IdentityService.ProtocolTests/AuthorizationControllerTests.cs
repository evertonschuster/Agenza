using System.Collections.Immutable;
using System.Security.Claims;
using IdentityService.Api.Controllers;
using IdentityService.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OpenIddict.Abstractions;
using OpenIddict.Server;
using OpenIddict.Server.AspNetCore;
using SignInResult = Microsoft.AspNetCore.Mvc.SignInResult;

namespace IdentityService.ProtocolTests;

public sealed class AuthorizationControllerTests
{
    private const string Api = "services-api";
    private const string Mcp = "https://mcp.test/mcp";

    private sealed class Fixture
    {
        public ApplicationUser User { get; } = new() { Id = Guid.NewGuid(), TenantId = Guid.NewGuid() };
        public UserManager<ApplicationUser> Users { get; }
        public SignInManager<ApplicationUser> SignIn { get; }
        public Dictionary<string, string[]> Resources { get; } = new()
        {
            ["services-api"] = [Api],
            ["services-mcp"] = [Mcp],
            ["other"] = ["https://other.test/api"],
        };
        private readonly IOpenIddictScopeManager _scopes = Substitute.For<IOpenIddictScopeManager>();

        public Fixture()
        {
            Users = Substitute.For<UserManager<ApplicationUser>>(
                Substitute.For<IUserStore<ApplicationUser>>(), null, null, null, null, null, null, null, null);
            SignIn = Substitute.For<SignInManager<ApplicationUser>>(
                Users, new HttpContextAccessor(), Substitute.For<IUserClaimsPrincipalFactory<ApplicationUser>>(),
                Options.Create(new IdentityOptions()), NullLogger<SignInManager<ApplicationUser>>.Instance,
                Substitute.For<IAuthenticationSchemeProvider>(), Substitute.For<IUserConfirmation<ApplicationUser>>());
            Users.GetUserAsync(Arg.Any<ClaimsPrincipal>()).Returns(User);
            SignIn.CanSignInAsync(User).Returns(true);
            SignIn.CreateUserPrincipalAsync(User).Returns(_ => Principal("Member"));
            _scopes.ListResourcesAsync(Arg.Any<ImmutableArray<string>>(), Arg.Any<CancellationToken>())
                .Returns(call => Enumerate(call.ArgAt<ImmutableArray<string>>(0)
                    .Where(Resources.ContainsKey).SelectMany(scope => Resources[scope]).Distinct()));
        }

        public ClaimsPrincipal Principal(string role = "Admin")
        {
            var identity = new ClaimsIdentity("Bearer", "name", "role");
            identity.AddClaims([new("sub", User.Id.ToString()), new("tenant_id", User.TenantId.ToString()), new("role", role)]);
            return new(identity);
        }

        public AuthorizationController Controller(OpenIddictRequest request, ClaimsPrincipal? previous = null)
        {
            var context = new DefaultHttpContext();
            context.Features.Set(new OpenIddictServerAspNetCoreFeature
            {
                Transaction = new OpenIddictServerTransaction { Request = request },
            });
            var authentication = Substitute.For<IAuthenticationService>();
            authentication.AuthenticateAsync(context, Arg.Any<string>()).Returns(
                AuthenticateResult.Success(new AuthenticationTicket(previous ?? Principal(), "test")));
            context.RequestServices = new Microsoft.Extensions.DependencyInjection.ServiceCollection()
                .AddSingleton(authentication).BuildServiceProvider();
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(
                new Dictionary<string, string?> { ["OAuth:DefaultResource"] = Api }).Build();
            return new AuthorizationController(_scopes, configuration, SignIn, Users)
            {
                ControllerContext = new ControllerContext { HttpContext = context },
            };
        }

        private static async IAsyncEnumerable<string> Enumerate(IEnumerable<string> resources)
        {
            await Task.CompletedTask;
            foreach (var resource in resources)
            {
                yield return resource;
            }
        }
    }

    [Theory]
    [InlineData("admin-panel", "services-api", null, Api)]
    [InlineData("agenza-mcp", "services-mcp", Mcp, Mcp)]
    public async Task Interfaces_interativas_recebem_escopo_do_recurso_e_as_mesmas_roles(string client, string scope, string? resource, string audience)
    {
        var fixture = new Fixture();
        var request = new OpenIddictRequest { ClientId = client, Scope = $"openid profile email tenant_id {scope} offline_access", ["resource"] = resource };
        var result = await fixture.Controller(request).Authorize(TestContext.Current.CancellationToken);

        var principal = result.Should().BeOfType<SignInResult>().Subject.Principal;
        principal.GetScopes().Should().BeEquivalentTo(request.GetScopes());
        principal.GetResources().Should().Equal(audience);
        principal.IsInRole("Member").Should().BeTrue();
        principal.FindFirst("tenant_id")!.Value.Should().Be(fixture.User.TenantId.ToString());
    }

    [Theory]
    [InlineData("services-api", Mcp)]
    [InlineData("services-mcp", Api)]
    public async Task Escopo_de_recurso_nao_emite_token_para_destino_da_outra_interface(string scope, string resource)
    {
        var fixture = new Fixture();
        var request = new OpenIddictRequest { ClientId = "client", Scope = scope, ["resource"] = resource };
        var result = await fixture.Controller(request).Authorize(TestContext.Current.CancellationToken);

        result.Should().BeOfType<ForbidResult>().Subject.Properties!.Items
            [OpenIddictServerAspNetCoreConstants.Properties.Error].Should().Be(OpenIddictConstants.Errors.InvalidTarget);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("openid services-api")]
    public async Task Renovacao_preserva_destino_original_e_utiliza_roles_atuais(string? requestedScopes)
    {
        var fixture = new Fixture();
        fixture.Resources["services-api"] = [Api, Mcp];
        var previous = fixture.Principal();
        previous.SetScopes("openid", "services-api", "offline_access");
        previous.SetResources(Api);
        var request = new OpenIddictRequest { ClientId = "admin-panel", GrantType = "refresh_token", Scope = requestedScopes };
        var result = await fixture.Controller(request, previous).Exchange(TestContext.Current.CancellationToken);

        var principal = result.Should().BeOfType<SignInResult>().Subject.Principal;
        principal.GetResources().Should().Equal(Api);
        principal.GetScopes().Should().BeSubsetOf(previous.GetScopes());
        principal.HasScope("openid").Should().BeTrue();
        principal.IsInRole("Member").Should().BeTrue();
        principal.IsInRole("Admin").Should().BeFalse();
    }

    [Fact]
    public async Task Renovacao_reduzida_remove_destino_associado_ao_escopo_retirado()
    {
        var fixture = new Fixture();
        var previous = fixture.Principal();
        previous.SetScopes("services-api", "other");
        previous.SetResources(Api, "https://other.test/api");
        var request = new OpenIddictRequest { ClientId = "admin-panel", GrantType = "refresh_token", Scope = "services-api" };
        var result = await fixture.Controller(request, previous).Exchange(TestContext.Current.CancellationToken);

        var principal = result.Should().BeOfType<SignInResult>().Subject.Principal;
        principal.GetScopes().Should().Equal("services-api");
        principal.GetResources().Should().Equal(Api);
    }

    [Fact]
    public async Task Renovacao_nao_pode_acrescentar_audiencia_solicitada()
    {
        var fixture = new Fixture();
        var previous = fixture.Principal();
        previous.SetScopes("services-api");
        previous.SetResources(Api);
        var request = new OpenIddictRequest { ClientId = "admin-panel", GrantType = "refresh_token", ["resource"] = Mcp };
        var result = await fixture.Controller(request, previous).Exchange(TestContext.Current.CancellationToken);

        result.Should().BeOfType<ForbidResult>().Subject.Properties!.Items
            [OpenIddictServerAspNetCoreConstants.Properties.Error].Should().Be(OpenIddictConstants.Errors.InvalidTarget);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Renovacao_recusa_usuario_bloqueado_ou_tenant_alterado(bool lockedOut)
    {
        var fixture = new Fixture();
        var previous = fixture.Principal();
        previous.SetScopes("services-api");
        previous.SetResources(Api);
        if (lockedOut)
        {
            fixture.Users.IsLockedOutAsync(fixture.User).Returns(true);
        }
        else
        {
            fixture.User.TenantId = Guid.NewGuid();
        }
        var request = new OpenIddictRequest { ClientId = "admin-panel", GrantType = "refresh_token" };
        var result = await fixture.Controller(request, previous).Exchange(TestContext.Current.CancellationToken);

        result.Should().BeOfType<ForbidResult>().Subject.Properties!.Items
            [OpenIddictServerAspNetCoreConstants.Properties.Error].Should().Be(OpenIddictConstants.Errors.InvalidGrant);
    }

    [Fact]
    public async Task Token_m2m_continua_sem_usuario_tenant_ou_roles()
    {
        var fixture = new Fixture();
        var request = new OpenIddictRequest { ClientId = "test-service-client", GrantType = "client_credentials", Scope = "services-api" };
        var result = await fixture.Controller(request).Exchange(TestContext.Current.CancellationToken);

        var principal = result.Should().BeOfType<SignInResult>().Subject.Principal;
        principal.GetResources().Should().Equal(Api);
        principal.FindFirst("sub")!.Value.Should().Be("test-service-client");
        principal.FindFirst("tenant_id").Should().BeNull();
        principal.FindFirst("role").Should().BeNull();
    }
}
