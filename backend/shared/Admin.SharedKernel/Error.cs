using System.Text.Json.Serialization;

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
// (docs/adr/0012) instead of one opaque message. Meta is machine-readable
// context for the client (docs/adr/0044) and is omitted from the payload when null.
public readonly record struct FieldError(
    string Code,
    string Message,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    IReadOnlyDictionary<string, string>? Meta = null);

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

    // Lets independent checks each return their own error and still answer with every problem at once: the result
    // keeps the first error's code, message and type, and merges every field error into one map.
    public static Error? Combine(params Error?[] errors)
    {
        var present = errors.Where(error => error.HasValue).Select(error => error!.Value).ToList();

        if (present.Count == 0)
        {
            return null;
        }

        if (present.Count == 1)
        {
            return present[0];
        }

        var fieldErrors = new Dictionary<string, List<FieldError>>();
        foreach (var error in present)
        {
            foreach (var (field, entries) in FieldErrorsOf(error))
            {
                if (!fieldErrors.TryGetValue(field, out var merged))
                {
                    merged = [];
                    fieldErrors[field] = merged;
                }

                merged.AddRange(entries);
            }
        }

        return present[0] with
        {
            FieldErrors = fieldErrors.ToDictionary(entry => entry.Key, entry => (IReadOnlyList<FieldError>)entry.Value),
        };
    }

    private static IReadOnlyDictionary<string, IReadOnlyList<FieldError>> FieldErrorsOf(Error error)
    {
        if (error.FieldErrors is not null)
        {
            return error.FieldErrors;
        }

        return new Dictionary<string, IReadOnlyList<FieldError>>
        {
            [string.Empty] = [new FieldError(error.Code, error.Message)],
        };
    }
}
