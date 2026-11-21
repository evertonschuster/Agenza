using Admin.SharedKernel;
using ModelContextProtocol.AspNetCore;
using ServicesService.Application;
using ServicesService.Infrastructure;
using ServicesService.Mcp.Setup;
using ServicesService.Mcp.Tools;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddMcpAuthentication(builder.Configuration);

builder.Services.AddSharedKernel();
builder.Services.AddServicesApplication();
builder.Services.AddServicesInfrastructure(builder.Configuration);

builder.Services.AddMcpServer()
    .WithHttpTransport(options => options.SessionMode = HttpServerSessionMode.Stateless)
    .AddAuthorizationFilters()
    .WithTools<HelloWorldTools>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapMcp("/mcp").RequireAuthorization(AuthenticationExtensions.McpUserPolicy);
app.MapDefaultEndpoints();

await app.RunAsync();
