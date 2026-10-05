using Serilog.Core;
using Serilog.Events;
using Serilog.Formatting;

namespace Admin.Logging.Tests;

internal sealed class CollectingSink : ILogEventSink
{
    public List<LogEvent> Events { get; } = [];

    public void Emit(LogEvent logEvent)
    {
        Events.Add(logEvent);
    }
}

internal sealed class FormattingSink : ILogEventSink
{
    private readonly ITextFormatter _formatter;
    private readonly TextWriter _output;

    public FormattingSink(ITextFormatter formatter, TextWriter output)
    {
        _formatter = formatter;
        _output = output;
    }

    public void Emit(LogEvent logEvent)
    {
        _formatter.Format(logEvent, _output);
    }
}
