using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Admin.SharedKernel.AspNetCore;
using Asp.Versioning;
using IdentityService.Api.Controllers;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace IdentityService.ProtocolTests;

public sealed class TenantProvisioningAuthorizationTests
{
    [Fact]
    public async Task Criar_tenant_sem_token_retorna_401_com_o_codigo_estavel()
    {
        await using var app = await StartAsync(TestContext.Current.CancellationToken);

        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
        var response = await client.PostAsJsonAsync(
            "/internal/v1/tenants",
            new { tenantName = "Nao deve ser criado", ownerEmail = "anonimo@demo.local", ownerPassword = "NaoCriado1!" },
            TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        body.RootElement.GetProperty("code").GetString().Should().Be("Authorization.Unauthorized");
    }

    private static async Task<WebApplication> StartAsync(CancellationToken cancellationToken)
    {
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        // The Api appsettings are copied next to the tests and may restrict AllowedHosts, which would answer 400 before authentication.
        builder.Configuration["AllowedHosts"] = "*";

        builder.Services.AddControllers().AddApplicationPart(typeof(TenantsController).Assembly);
        builder.Services.AddProblemDetails();
        builder.Services.AddAuthorizationProblemDetails();
        builder.Services.AddApiVersioning(options => options.ApiVersionReader = new UrlSegmentApiVersionReader()).AddMvc();
        builder.Services.AddOpenIddict()
            .AddServer(options =>
            {
                options.SetTokenEndpointUris("connect/token");
                options.AllowClientCredentialsFlow();
                options.AddEphemeralEncryptionKey().AddEphemeralSigningKey();
                options.DisableAccessTokenEncryption();
                options.UseAspNetCore().EnableTokenEndpointPassthrough().DisableTransportSecurityRequirement();
            })
            .AddValidation(options =>
            {
                options.UseLocalServer();
                options.UseAspNetCore();
            });

        var app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync(cancellationToken);
        return app;
    }
}
