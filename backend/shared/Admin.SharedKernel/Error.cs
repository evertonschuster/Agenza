namespace Admin.SharedKernel;

public enum ErrorType
{
    Failure,
    Validation,
    NotFound,
    Conflict,
    Forbidden,
}

/// <summary>
/// A business-error value, not an exception - the whole point of the
/// Result pattern (repo convention) is that expected failures (a
/// duplicate name, a missing record, a validation rule) are data a
/// caller inspects, not control flow a caller must catch. Reserve
/// exceptions for truly exceptional/programmer-error conditions.
/// </summary>
public readonly record struct Error(string Code, string Message, ErrorType Type)
{
    public static readonly Error None = new(string.Empty, string.Empty, ErrorType.Failure);

    public static Error Failure(string code, string message) => new(code, message, ErrorType.Failure);

    public static Error Validation(string code, string message) => new(code, message, ErrorType.Validation);

    public static Error NotFound(string code, string message) => new(code, message, ErrorType.NotFound);

    public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);

    public static Error Forbidden(string code, string message) => new(code, message, ErrorType.Forbidden);
}
