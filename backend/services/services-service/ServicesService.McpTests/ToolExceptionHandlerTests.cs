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

public sealed class ToolExceptionHandlerTests
{
    [Theory]
    [InlineData(false, null, "http-trace-123", "http-trace-123", "http-trace-123")]
    [InlineData(true, "correlation-123", "http-trace-123", "http-trace-123", "correlation-123")]
    [InlineData(false, "", "http-trace-123", "http-trace-123", "http-trace-123")]
    [InlineData(false, "correlation\r\nlinha falsa", "http-trace-123", "http-trace-123", "correlation__linha falsa")]
    [InlineData(false, "correlation\tentry\0\u007f", "http-trace-123", "http-trace-123", "correlation_entry__")]
    [InlineData(false, null, "trace\r\n\tentry", "trace___entry", "trace___entry")]
    public async Task Filtro_registrado_oculta_excecao_e_registra_detalhes_no_servidor(
        bool cancellationNotRequested, string? correlationId, string traceId,
        string expectedTrace, string expectedCorrelation)
    {
        using var logs = new CapturingLoggerProvider();
        var services = new ServiceCollection().AddLogging(builder => builder.AddProvider(logs));
        services.AddMcpServer().WithToolExceptionHandling();
        using var provider = services.BuildServiceProvider();
        var httpContext = new DefaultHttpContext { TraceIdentifier = traceId };
        if (correlationId is not null)
        {
            httpContext.Request.Headers["X-Correlation-Id"] = correlationId;
        }

        provider.GetRequiredService<IHttpContextAccessor>().HttpContext = httpContext;
        var options = provider.GetRequiredService<IOptions<McpServerOptions>>().Value;
        await using var transport = new StreamServerTransport(Stream.Null, Stream.Null);
        await using var server = McpServer.Create(transport, options, serviceProvider: provider);
        var context = new RequestContext<CallToolRequestParams>(server,
            new JsonRpcRequest { Id = new RequestId(1), Method = "tools/call" },
            new CallToolRequestParams { Name = "who_am_i\r\n\tlinha falsa" }) { Services = provider };
        Exception exception = cancellationNotRequested
            ? new OperationCanceledException("timeout interno")
            : new InvalidOperationException("connection string secreta");
        var tool = McpServerTool.Create((Func<string>)(() => throw exception),
            new McpServerToolCreateOptions { Name = "failing_tool" });
        var filter = options.Filters.Request.CallToolFilters.Should().ContainSingle().Subject;
        var handler = filter((request, token) => tool.InvokeAsync(request, token));

        var result = await handler(context, CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.StructuredContent.Should().BeNull();
        var text = result.Content.Should().ContainSingle().Subject.Should().BeOfType<TextContentBlock>().Subject;
        using var json = JsonDocument.Parse(text.Text);
        var error = json.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Unexpected.Error");
        error.GetProperty("message").GetString().Should().Be("Ocorreu um erro inesperado.");
        error.GetProperty("type").GetString().Should().Be("Failure");
        error.GetProperty("traceId").GetString().Should().Be(expectedTrace);
        error.GetProperty("correlationId").GetString().Should().Be(expectedCorrelation);
        text.Text.Should().NotContain(exception.Message);
        var entry = logs.Entries.Should().ContainSingle(entry => entry.Level == LogLevel.Error).Subject;
        entry.Exception.Should().BeSameAs(exception);
        entry.Message.Should().Contain("who_am_i___linha falsa");
        entry.Message.Should().Contain(expectedTrace)
            .And.Contain(expectedCorrelation);
        entry.Message.Should().NotContain("\r").And.NotContain("\n").And.NotContain("\t");
        entry.Message.Any(char.IsControl).Should().BeFalse();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Filtro_preserva_sucesso_e_falha_esperada_sem_reescrever_resposta(bool failure)
    {
        var expected = failure
            ? Error.NotFound("User.NotFound", "Usuário não encontrado.").ToToolResult()
            : new CallToolResult { Content = [new TextContentBlock { Text = "Concluído." }] };
        using var logs = new CapturingLoggerProvider();
        var handler = new ToolExceptionHandler(logs.CreateLogger<ToolExceptionHandler>(), new HttpContextAccessor());

        var result = await handler.HandleAsync(null!, (_, _) => ValueTask.FromResult(expected), CancellationToken.None);

        result.Should().BeSameAs(expected);
        logs.Entries.Should().BeEmpty();
    }

    [Fact]
    public async Task Cancelamento_solicitado_nao_e_convertido_em_erro_inesperado()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var exception = new OperationCanceledException(cancellation.Token);
        using var logs = new CapturingLoggerProvider();
        var handler = new ToolExceptionHandler(logs.CreateLogger<ToolExceptionHandler>(), new HttpContextAccessor());

        var action = async () => await handler.HandleAsync(null!,
            (_, _) => ValueTask.FromException<CallToolResult>(exception), cancellation.Token);

        (await action.Should().ThrowAsync<OperationCanceledException>()).Which.Should().BeSameAs(exception);
        logs.Entries.Should().BeEmpty();
    }

    public static TheoryData<Exception> ProtocolExceptions() => new()
    {
        new McpProtocolException("Requisição inválida.", McpErrorCode.InvalidParams),
        new McpException("Falha esperada da ferramenta."),
        new InputRequiredException(requestState: "continuar"),
    };

    [Theory]
    [MemberData(nameof(ProtocolExceptions))]
    public async Task Excecoes_controladas_do_mcp_sao_preservadas(Exception exception)
    {
        using var logs = new CapturingLoggerProvider();
        var handler = new ToolExceptionHandler(logs.CreateLogger<ToolExceptionHandler>(), new HttpContextAccessor());
        var action = async () => await handler.HandleAsync(null!,
            (_, _) => ValueTask.FromException<CallToolResult>(exception), CancellationToken.None);

        (await action.Should().ThrowAsync<Exception>()).Which.Should().BeSameAs(exception);
        logs.Entries.Should().BeEmpty();
    }

    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public List<(LogLevel Level, Exception? Exception, string Message)> Entries { get; } = [];

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(this);

        public ILogger<T> CreateLogger<T>() => new Logger<T>(new LoggerFactory([this]));

        public void Dispose() { }

        private sealed class CapturingLogger(CapturingLoggerProvider provider) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state,
                Exception? exception, Func<TState, Exception?, string> formatter) =>
                provider.Entries.Add((logLevel, exception, formatter(state, exception)));
        }
    }
}
