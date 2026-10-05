using System.Globalization;
using Serilog.Formatting;
using Serilog.Templates;
using Serilog.Templates.Themes;

namespace Admin.Logging;

internal static class ReadableConsole
{
    private const string Template =
        "[{@t:HH:mm:ss} {@l:u3}]" +
        "{#if SourceContext is not null} {Substring(SourceContext, LastIndexOf(SourceContext, '.') + 1)}:{#end}" +
        " {@m}\n{@x}";

    public static ITextFormatter CreateFormatter(bool colors)
    {
        var theme = colors ? TemplateTheme.Code : null;

        return new ExpressionTemplate(
            Template,
            CultureInfo.InvariantCulture,
            theme: theme,
            applyThemeWhenOutputIsRedirected: true);
    }

    public static bool ShouldUseColors(
        bool isDevelopment,
        bool noColorRequested,
        bool outputRedirected,
        bool colorWhenRedirected)
    {
        if (!isDevelopment)
        {
            return false;
        }

        if (noColorRequested)
        {
            return false;
        }

        return colorWhenRedirected || !outputRedirected;
    }
}
