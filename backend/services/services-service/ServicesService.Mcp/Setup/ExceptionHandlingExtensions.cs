namespace ServicesService.Mcp.Setup;

public static class ExceptionHandlingExtensions
{
    public static IMcpServerBuilder WithToolExceptionHandling(this IMcpServerBuilder builder)
    {
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddSingleton<ToolExceptionHandler>();
        return builder.WithRequestFilters(filters => filters.AddCallToolFilter(next =>
            (context, cancellationToken) => context.Services!.GetRequiredService<ToolExceptionHandler>()
                .HandleAsync(context, next, cancellationToken)));
    }
}
