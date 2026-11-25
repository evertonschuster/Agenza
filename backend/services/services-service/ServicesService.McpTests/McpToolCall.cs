using System.IO.Pipelines;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace ServicesService.McpTests;

internal static class McpToolCall
{
    public static async Task<CallToolResult> InvokeAsync(IServiceProvider services, string name,
        IReadOnlyDictionary<string, object?> arguments, CancellationToken cancellationToken)
    {
        var input = new Pipe();
        var output = new Pipe();
        using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        lifetime.CancelAfter(TimeSpan.FromSeconds(15));
        var options = services.GetRequiredService<IOptions<McpServerOptions>>().Value;
        await using var transport = new StreamServerTransport(input.Reader.AsStream(), output.Writer.AsStream());
        await using var server = McpServer.Create(transport, options,
            services.GetRequiredService<ILoggerFactory>(), services);
        var running = server.RunAsync(lifetime.Token);
        try
        {
            await using var client = await McpClient.CreateAsync(
                new StreamClientTransport(input.Writer.AsStream(), output.Reader.AsStream()),
                cancellationToken: lifetime.Token);
            return await client.CallToolAsync(name, arguments, cancellationToken: lifetime.Token);
        }
        finally
        {
            await lifetime.CancelAsync();
            try
            {
                await running;
            }
            catch (OperationCanceledException) when (lifetime.IsCancellationRequested)
            {
            }
        }
    }
}
