namespace Admin.SharedKernel.AspNetCore;

/// <summary>
/// Standard success response envelope for all API endpoints.
/// Provides consistency with ApiProblemDetails for error responses.
/// </summary>
/// <typeparam name="T">The type of data being returned</typeparam>
public sealed class ApiResponse<T>
{
    /// <summary>
    /// The actual data payload.
    /// </summary>
    public required T Data { get; init; }

    /// <summary>
    /// Always true for success responses.
    /// </summary>
    public bool Success { get; init; } = true;

    /// <summary>
    /// UTC timestamp when the response was generated.
    /// </summary>
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Trace identifier for correlating the response with logs.
    /// </summary>
    public string? TraceId { get; init; }

    /// <summary>
    /// Correlation identifier for end-to-end tracing.
    /// </summary>
    public string? CorrelationId { get; init; }
}
