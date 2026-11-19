using ModelContextProtocol.AspNetCore;
using ServicesService.Mcp.Tools;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddMcpServer()
    .WithHttpTransport(options => options.SessionMode = HttpServerSessionMode.Stateless)
    .WithTools<HelloWorldTools>();

var app = builder.Build();

app.MapMcp("/mcp");
app.MapDefaultEndpoints();

await app.RunAsync();
