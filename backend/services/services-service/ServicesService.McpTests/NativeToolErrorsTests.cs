using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace ServicesService.McpTests;

public sealed class NativeToolErrorsTests
{
    [Theory]
    [InlineData("internal_failure", false)]
    [InlineData("json_failure", false)]
    [InlineData("expected_failure", true)]
    public async Task Sdk_registra_excecao_e_expoe_somente_mensagem_controlada(string name, bool exposesMessage)
    {
        using var logs = new CapturingLoggerProvider();
        var services = new ServiceCollection().AddLogging(builder => builder.AddProvider(logs));
        services.AddMcpServer().WithTools<FailingTools>();
        using var provider = services.BuildServiceProvider();

        var result = await McpToolCall.InvokeAsync(provider, name, new Dictionary<string, object?>(), TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject.Text;
        text.Should().NotBeNullOrWhiteSpace().And.NotContain("detalhe interno");
        text.Contains("falha controlada", StringComparison.Ordinal).Should().Be(exposesMessage);
        logs.Exceptions.Should().ContainSingle();
    }

    [Fact]
    public async Task Cancelamento_solicitado_e_preservado_pela_ferramenta_nativa()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var tool = McpServerTool.Create(() => "concluído");
        await using var transport = new StreamServerTransport(Stream.Null, Stream.Null);
        await using var server = McpServer.Create(transport, new McpServerOptions());
        var request = new RequestContext<CallToolRequestParams>(server,
            new JsonRpcRequest { Id = new RequestId(1), Method = "tools/call" },
            new CallToolRequestParams { Name = tool.ProtocolTool.Name });

        var action = async () => await tool.InvokeAsync(request, cancellation.Token);

        await action.Should().ThrowAsync<OperationCanceledException>();
    }

    private sealed class FailingTools
    {
        [McpServerTool(Name = "internal_failure")]
        public static string InternalFailure() => throw new InvalidOperationException("detalhe interno");

        [McpServerTool(Name = "json_failure")]
        public static string JsonFailure() => throw new JsonException("detalhe interno");

        [McpServerTool(Name = "expected_failure")]
        public static string ExpectedFailure() => throw new McpException("falha controlada");
    }

    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public List<Exception> Exceptions { get; } = [];

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(this);

        public void Dispose() { }

        private sealed class CapturingLogger(CapturingLoggerProvider provider) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state,
                Exception? exception, Func<TState, Exception?, string> formatter)
            {
                if (logLevel == LogLevel.Error && exception is not null)
                {
                    provider.Exceptions.Add(exception);
                }
            }
        }
    }
}
