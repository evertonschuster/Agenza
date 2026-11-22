using System.Security.Claims;
using System.Text.Json;
using Admin.Identity.Client;
using Admin.SharedKernel;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Application;
using ServicesService.Application.Users.GetCurrentUser;
using ServicesService.Infrastructure;
using ServicesService.Mcp.Tools;

namespace ServicesService.McpTests;

public sealed class IdentityToolsTests
{
    [Fact]
    public async Task Identidade_retorna_usuario_e_tenant_pelo_dispatcher()
    {
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var context = Context(userId, tenantId, "maria", "maria@exemplo.com", "Clínica Maria");
        context.Request.Headers["X-Tenant-Id"] = Guid.NewGuid().ToString();
        var accessor = new HttpContextAccessor { HttpContext = context };
        using var provider = Services(accessor);
        using var scope = provider.CreateScope();
        var tools = new IdentityTools(scope.ServiceProvider.GetRequiredService<IDispatcher>());

        var result = await tools.WhoAmI(CancellationToken.None);
        var response = Response(result);

        result.IsError.Should().BeFalse();
        response.User.Should().Be(new CurrentUserDetails(userId, "maria", "maria@exemplo.com"));
        response.Tenant.Should().Be(new CurrentUserTenant(tenantId, "Clínica Maria"));
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject;
        text.Text.Should().Be(result.StructuredContent!.Value.GetRawText());
    }

    [Fact]
    public async Task Identidade_nao_reutiliza_usuario_ou_tenant_de_outra_requisicao()
    {
        var accessor = new HttpContextAccessor
        {
            HttpContext = Context(Guid.NewGuid(), Guid.NewGuid(), "maria", "maria@exemplo.com", "Clínica Maria"),
        };
        using var provider = Services(accessor);
        using var scope = provider.CreateScope();
        var tools = new IdentityTools(scope.ServiceProvider.GetRequiredService<IDispatcher>());
        var previous = Response(await tools.WhoAmI(CancellationToken.None));
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        accessor.HttpContext = Context(userId, tenantId, "joao", "joao@exemplo.com", "Salão João");

        var response = Response(await tools.WhoAmI(CancellationToken.None));

        response.User.Should().Be(new CurrentUserDetails(userId, "joao", "joao@exemplo.com"));
        response.Tenant.Should().Be(new CurrentUserTenant(tenantId, "Salão João"));
        response.Tenant.Id.Should().NotBe(previous.Tenant.Id);
    }

    [Fact]
    public async Task Identidade_preserva_campos_ausentes_no_conteudo_estruturado()
    {
        var tenantId = Guid.NewGuid();
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("tenant_id", tenantId.ToString())], "Bearer")),
        };
        using var provider = Services(new HttpContextAccessor { HttpContext = context });
        using var scope = provider.CreateScope();
        var tools = new IdentityTools(scope.ServiceProvider.GetRequiredService<IDispatcher>());

        var result = await tools.WhoAmI(CancellationToken.None);
        var response = Response(result);

        response.User.Should().Be(new CurrentUserDetails(null, null, null));
        response.Tenant.Should().Be(new CurrentUserTenant(tenantId, null));
        var json = JsonSerializer.SerializeToElement(result.StructuredContent, McpJsonUtilities.DefaultOptions);
        json.GetProperty("user").GetProperty("id").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("user").GetProperty("username").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("user").GetProperty("email").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("tenant").GetProperty("name").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Falha_do_dispatcher_e_retornada_como_erro_da_ferramenta()
    {
        var validator = new InlineValidator<GetCurrentUserQuery>();
        validator.RuleFor(query => query).Must(_ => false).WithMessage("Não foi possível consultar o usuário.");
        using var provider = Services(new HttpContextAccessor(), validator);
        using var scope = provider.CreateScope();
        var tools = new IdentityTools(scope.ServiceProvider.GetRequiredService<IDispatcher>());

        var result = await tools.WhoAmI(CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject;
        using var json = JsonDocument.Parse(text.Text);
        var error = json.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Be("Não foi possível consultar o usuário.");
        error.GetProperty("type").GetString().Should().Be("Validation");
    }

    [Fact]
    public void Ferramenta_publica_contrato_estruturado_somente_leitura_sem_parametros()
    {
        using var provider = Services(new HttpContextAccessor());
        using var scope = provider.CreateScope();
        var tools = new IdentityTools(scope.ServiceProvider.GetRequiredService<IDispatcher>());
        var tool = McpServerTool.Create(typeof(IdentityTools).GetMethod(nameof(IdentityTools.WhoAmI))!, tools);
        var contract = tool.ProtocolTool;

        contract.Name.Should().Be("who_am_i");
        contract.InputSchema.GetProperty("properties").EnumerateObject().Should().BeEmpty();
        contract.OutputSchema.Should().NotBeNull();
        contract.OutputSchema!.Value.GetProperty("properties").TryGetProperty("user", out _).Should().BeTrue();
        contract.OutputSchema.Value.GetProperty("properties").TryGetProperty("tenant", out _).Should().BeTrue();
        contract.OutputSchema.Value.GetProperty("properties").GetProperty("user")
            .GetProperty("description").GetString().Should().Contain("identidade autenticada");
        contract.OutputSchema.Value.GetProperty("properties").GetProperty("tenant")
            .GetProperty("description").GetString().Should().Contain("Estabelecimento");
        contract.Description.Should().Contain("Campos nulos indicam informação indisponível");
        contract.Annotations!.ReadOnlyHint.Should().BeTrue();
        contract.Annotations.DestructiveHint.Should().BeFalse();
        contract.Annotations.OpenWorldHint.Should().BeFalse();
    }

    private static CurrentUserResponse Response(CallToolResult result)
    {
        result.IsError.Should().NotBeTrue();
        result.StructuredContent.Should().NotBeNull();
        return result.StructuredContent!.Value.Deserialize<CurrentUserResponse>(McpJsonUtilities.DefaultOptions)!;
    }

    private static ServiceProvider Services(IHttpContextAccessor accessor, IValidator<GetCurrentUserQuery>? validator = null)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Identity:Authority"] = "https://identity.test/",
            ["ConnectionStrings:Default"] = "Host=localhost;Database=unused;Username=unused",
        }).Build();
        var services = new ServiceCollection().AddLogging();
        services.AddIdentityServiceAuthentication(configuration, "services-api");
        services.AddSingleton(accessor);
        services.AddSharedKernel();
        services.AddServicesApplication();
        services.AddServicesInfrastructure(configuration);
        if (validator is not null)
        {
            services.AddSingleton(validator);
        }

        return services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
    }

    private static DefaultHttpContext Context(Guid userId, Guid tenantId, string username, string email, string tenantName) => new()
    {
        User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("sub", userId.ToString()), new Claim("tenant_id", tenantId.ToString()),
             new Claim("name", username), new Claim("email", email), new Claim("tenant_name", tenantName)], "Bearer")),
    };
}
