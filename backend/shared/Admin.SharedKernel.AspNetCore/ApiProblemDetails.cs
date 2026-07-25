using Microsoft.AspNetCore.Mvc;

namespace Admin.SharedKernel.AspNetCore;

/// <summary>
/// Stable error contract shared by the APIs and their generated clients.
/// </summary>
public sealed class ApiProblemDetails : ProblemDetails
{
    public string? Code { get; init; }

    public IReadOnlyDictionary<string, IReadOnlyList<FieldError>>? Errors { get; init; }
}
