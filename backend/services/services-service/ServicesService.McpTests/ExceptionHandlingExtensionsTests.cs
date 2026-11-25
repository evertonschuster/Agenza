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
    public async Task Argumento_ausente_em_outra_ferramenta_preserva_a_mensagem_do_sdk()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddMcpServer().WithToolExceptionHandling().WithTools<FailingTools>();
        using var provider = services.BuildServiceProvider();

        var result = await McpToolCall.InvokeAsync(provider, "required_arguments", new Dictionary<string, object?> { ["name"] = "Teste" },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain("required parameter 'count'");
        error.GetProperty("fieldErrors").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Entrada_invalida_na_raiz_retorna_validacao_sem_campo()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddMcpServer().WithToolExceptionHandling().WithTools<FailingTools>();
        using var provider = services.BuildServiceProvider();

        var result = await McpToolCall.InvokeAsync(provider, "failure", new Dictionary<string, object?> { ["timeout"] = "inválido" },
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Contain("System.Boolean");
        error.GetProperty("fieldErrors").ValueKind.Should().Be(JsonValueKind.Null);
    }

    public static TheoryData<Exception> ValidationExceptionsWithoutField() => new()
    {
        new JsonException("JSON inválido"),
        new ArgumentException("Argumento inválido", "value"),
    };

    [Theory]
    [MemberData(nameof(ValidationExceptionsWithoutField))]
    public async Task Excecao_de_validacao_sem_campo_preserva_a_mensagem(Exception exception)
    {
        using var provider = Services();
        var filter = provider.GetRequiredService<IOptions<McpServerOptions>>().Value.Filters.Request.CallToolFilters.Single();
        var invoke = filter((_, _) => ValueTask.FromException<CallToolResult>(exception));

        var result = await invoke(null!, TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        using var document = JsonDocument.Parse(result.Content.OfType<TextContentBlock>().Single().Text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Validation.Failed");
        error.GetProperty("message").GetString().Should().Be(exception.Message);
        error.GetProperty("fieldErrors").ValueKind.Should().Be(JsonValueKind.Null);
    }

    public static TheoryData<Exception> ProtocolControlExceptions() => new()
    {
        new McpProtocolException("Protocolo inválido", McpErrorCode.InvalidParams),
        new InputRequiredException(requestState: "continuar"),
    };

    [Theory]
    [MemberData(nameof(ProtocolControlExceptions))]
    public async Task Falhas_de_protocolo_e_pedidos_de_entrada_seguem_para_o_sdk(Exception exception)
    {
        using var provider = Services();
        var filter = provider.GetRequiredService<IOptions<McpServerOptions>>().Value.Filters.Request.CallToolFilters.Single();
        var invoke = filter((_, _) => ValueTask.FromException<CallToolResult>(exception));

        var action = async () => await invoke(null!, TestContext.Current.CancellationToken);

        (await action.Should().ThrowAsync<Exception>()).Which.Should().BeSameAs(exception);
    }

    [Fact]
    public async Task Tempo_limite_retorna_codigo_especifico_e_registra_detalhe_somente_no_servidor()
    {
        using var logs = new CapturingLoggerProvider();
        var services = new ServiceCollection().AddLogging(builder => builder.AddProvider(logs));
        services.AddMcpServer().WithToolExceptionHandling().WithTools<FailingTools>();
        using var provider = services.BuildServiceProvider();
        var httpContext = new DefaultHttpContext { TraceIdentifier = "trace-id" };
        httpContext.Request.Headers["X-Correlation-Id"] = "correlation-id";
        provider.GetRequiredService<IHttpContextAccessor>().HttpContext = httpContext;

        var result = await McpToolCall.InvokeAsync(provider, "expired", new Dictionary<string, object?>(),
            TestContext.Current.CancellationToken);

        result.IsError.Should().BeTrue();
        var text = result.Content.OfType<TextContentBlock>().Single().Text;
        using var document = JsonDocument.Parse(text);
        var error = document.RootElement.GetProperty("error");
        error.GetProperty("code").GetString().Should().Be("Operation.Timeout");
        error.GetProperty("message").GetString().Should().Be("A operação excedeu o tempo limite.");
        error.GetProperty("traceId").GetString().Should().Be("trace-id");
        error.GetProperty("correlationId").GetString().Should().Be("correlation-id");
        text.Should().NotContain("detalhe interno");
        var entry = logs.Entries.Should().ContainSingle().Subject;
        entry.Exception.Should().BeOfType<TimeoutException>().Which.Message.Should().Be("detalhe interno");
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
        [McpServerTool(Name = "expired")]
        public static string Expired() => throw new TimeoutException("detalhe interno");

        [McpServerTool(Name = "required_arguments")]
        public static string RequiredArguments(string name, int count, bool active = true) => $"{name}: {count}, {active}";

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
