using ModelContextProtocol.AspNetCore;
using ServicesService.Mcp.Tools;
using ServicesService.Mcp.Setup;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddMcpAuthentication(builder.Configuration);

builder.Services.AddMcpServer()
    .WithHttpTransport(options => options.SessionMode = HttpServerSessionMode.Stateless)
    .WithTools<HelloWorldTools>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapMcp("/mcp").RequireAuthorization("McpUser");
app.MapDefaultEndpoints();

await app.RunAsync();
