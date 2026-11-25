using Admin.Identity.Client;
using Admin.SharedKernel;
using ModelContextProtocol.AspNetCore;
using ServicesService.Application;
using ServicesService.Infrastructure;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddMcpAuthentication(builder.Configuration);
builder.Services.AddMcpCors(builder.Configuration);

builder.Services.AddSharedKernel();
builder.Services.AddServicesApplication();
builder.Services.AddServicesInfrastructure(builder.Configuration);

var mcpJsonOptions = builder.Services.AddMcpValueObjectInputs(TimeProvider.System);
builder.Services.AddMcpServer()
    .WithHttpTransport(options => options.SessionMode = HttpServerSessionMode.Stateless)
    .AddAuthorizationFilters()
    .WithToolExceptionHandling()
    .WithTools([typeof(HelloWorldTools), typeof(IdentityTools), typeof(TagsTools)], mcpJsonOptions);

var app = builder.Build();

app.UseCors(CorsExtensions.PolicyName);
app.UseMcpChallengeParameters(AuthenticationExtensions.ChallengeScope);
app.UseAuthentication();
app.UseAuthorization();

app.MapMcp("/mcp").RequireAuthorization(TenantAuthorizationExtensions.PolicyName);
app.MapDefaultEndpoints();

await app.RunAsync();
