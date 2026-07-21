namespace Admin.SharedKernel;

public enum ErrorType
{
    Failure,
    Validation,
    NotFound,
    Conflict,
    Forbidden,
}

// One FluentValidation failure, kept intact instead of collapsed into a
// joined string - lets the Api return a structured, per-field response
// (docs/adr/0012) instead of one opaque message.
public readonly record struct FieldError(string Code, string Message);

public readonly record struct Error(
    string Code,
    string Message,
    ErrorType Type,
    IReadOnlyDictionary<string, IReadOnlyList<FieldError>>? FieldErrors = null)
{
    public static readonly Error None = new(string.Empty, string.Empty, ErrorType.Failure);

    public static Error Failure(string code, string message) => new(code, message, ErrorType.Failure);

    public static Error Validation(string code, string message) => new(code, message, ErrorType.Validation);

    public static Error Validation(
        string code,
        string message,
        IReadOnlyDictionary<string, IReadOnlyList<FieldError>> fieldErrors) =>
        new(code, message, ErrorType.Validation, fieldErrors);

    public static Error NotFound(string code, string message) => new(code, message, ErrorType.NotFound);

    public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);

    public static Error Forbidden(string code, string message) => new(code, message, ErrorType.Forbidden);
}
