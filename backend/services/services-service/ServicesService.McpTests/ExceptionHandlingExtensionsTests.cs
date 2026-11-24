using System.Text.Json;
using Admin.SharedKernel;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Extensions;
using ServicesService.Mcp.Setup;

namespace ServicesService.McpTests;

public sealed class ExceptionHandlingExtensionsTests
{
    [Theory]
    [InlineData(false, null)]
    [InlineData(false, "correlation\r\nid")]
    [InlineData(true, "correlation-id")]
    public async Task Falha_inesperada_retorna_identificadores_e_registra_detalhes_somente_no_servidor(bool timeout, string? correlation)
    {
        using var logs = new CapturingLoggerProvider();
        var services = new ServiceCollection().AddLogging(builder => builder.AddProvider(logs));
        services.AddMcpServer().WithToolExceptionHandling().WithTools<FailingTools>();
        using var provider = services.BuildServiceProvider();
        var httpContext = new DefaultHttpContext { TraceIdentifier = "trace-id" };
        if (correlation is not null)
        {
            httpContext.Request.Headers["X-Correlation-Id"] = correlation;
        }

        provider.GetRequiredService<IHttpContextAccessor>().HttpContext = httpContext;

        var result = await McpToolCall.InvokeAsync(provider, "failure", new Dictionary<string, object?> { ["timeout"] = timeout },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject.Text;
        using var document = JsonDocument.Parse(text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Unexpected.Error");
        error.GetProperty("message").GetString().Should().Be("Ocorreu um erro inesperado.");
        error.GetProperty("traceId").GetString().Should().Be("trace-id");
        error.GetProperty("correlationId").GetString().Should().Be(correlation?.Replace('\r', '_').Replace('\n', '_') ?? "trace-id");
        text.Should().NotContain("detalhe interno");
        var entry = logs.Entries.Should().ContainSingle().Subject;
        entry.Exception.Message.Should().Be("detalhe interno");
        entry.Message.Should().Contain("failure").And.Contain("trace-id");
        entry.Message.Any(char.IsControl).Should().BeFalse();
    }

    [Fact]
    public async Task Entrada_invalida_continua_com_a_resposta_nativa_do_sdk()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddMcpServer().WithToolExceptionHandling().WithTools<FailingTools>();
        using var provider = services.BuildServiceProvider();

        var result = await McpToolCall.InvokeAsync(provider, "failure", new Dictionary<string, object?> { ["timeout"] = "inválido" },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>()
            .Which.Text.Should().NotContain("Unexpected.Error");
    }

    public static TheoryData<Exception> NativeExceptions() => new()
    {
        new JsonException("JSON inválido"),
        new ArgumentException("Argumento inválido"),
        new McpException("Falha controlada"),
        new McpProtocolException("Protocolo inválido", McpErrorCode.InvalidParams),
        new InputRequiredException(requestState: "continuar"),
    };

    [Theory]
    [MemberData(nameof(NativeExceptions))]
    public async Task Falhas_tratadas_pelo_sdk_nao_sao_reclassificadas_como_inesperadas(Exception exception)
    {
        using var provider = Services();
        var filter = provider.GetRequiredService<IOptions<McpServerOptions>>().Value.Filters.Request.CallToolFilters.Single();
        var invoke = filter((_, _) => ValueTask.FromException<CallToolResult>(exception));

        var action = async () => await invoke(null!, TestContext.Current.CancellationToken);

        (await action.Should().ThrowAsync<Exception>()).Which.Should().BeSameAs(exception);
    }

    [Fact]
    public async Task Cancelamento_solicitado_nao_e_reescrito()
    {
        using var provider = Services();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var exception = new OperationCanceledException(cancellation.Token);
        var filter = provider.GetRequiredService<IOptions<McpServerOptions>>().Value.Filters.Request.CallToolFilters.Single();
        var invoke = filter((_, _) => ValueTask.FromException<CallToolResult>(exception));

        var action = async () => await invoke(null!, cancellation.Token);

        (await action.Should().ThrowAsync<OperationCanceledException>()).Which.Should().BeSameAs(exception);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Resultados_esperados_sao_preservados(bool failure)
    {
        using var provider = Services();
        var expected = failure
            ? Error.NotFound("Tag.NotFound", "Etiqueta não encontrada.").ToToolResult()
            : new CallToolResult { Content = [new TextContentBlock { Text = "concluído" }] };
        var filter = provider.GetRequiredService<IOptions<McpServerOptions>>().Value.Filters.Request.CallToolFilters.Single();
        var invoke = filter((_, _) => ValueTask.FromResult(expected));

        var result = await invoke(null!, TestContext.Current.CancellationToken);

        result.Should().BeSameAs(expected);
    }

    private static ServiceProvider Services()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddMcpServer().WithToolExceptionHandling();
        return services.BuildServiceProvider();
    }

    private sealed class FailingTools
    {
        [McpServerTool(Name = "failure")]
        public static string Failure(bool timeout) => timeout
            ? throw new OperationCanceledException("detalhe interno")
            : throw new InvalidOperationException("detalhe interno");
    }

    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public List<(Exception Exception, string Message)> Entries { get; } = [];

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
                    provider.Entries.Add((exception, formatter(state, exception)));
                }
            }
        }
    }
}
