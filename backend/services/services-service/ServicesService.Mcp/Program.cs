using ModelContextProtocol.AspNetCore;
using ServicesService.Mcp.Tools;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMcpServer()
    .WithHttpTransport(options => options.SessionMode = HttpServerSessionMode.Stateless)
    .WithTools<HelloWorldTools>();

var app = builder.Build();

app.MapMcp("/mcp");

await app.RunAsync();
