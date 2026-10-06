using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Admin.SharedKernel.AspNetCore;

public static class ModelStateErrorMapper
{
    private const string ValidationFailed = "Validation.Failed";
    private const string ConversionFailure = "The JSON value could not be converted";
    private const string ParserPosition = "LineNumber:";

    public static Error ToError(ModelStateDictionary modelState)
    {
        // A failed body read also marks the whole body parameter as missing; that entry only repeats the real one.
        var fieldErrors = new Dictionary<string, IReadOnlyList<FieldError>>();
        string? message = null;

        foreach (var (key, entry) in modelState)
        {
            if (entry is not { Errors.Count: > 0 })
            {
                continue;
            }

            foreach (var modelError in entry.Errors)
            {
                var text = modelError.ErrorMessage;
                Add(fieldErrors, FieldOf(key, text), new FieldError(ValidationFailed, text));
                message ??= text;
            }
        }

        return Error.Validation(ValidationFailed, message ?? string.Empty, fieldErrors);
    }

    private static void Add(Dictionary<string, IReadOnlyList<FieldError>> fieldErrors, string field, FieldError fieldError)
    {
        if (fieldErrors.TryGetValue(field, out var existing))
        {
            fieldErrors[field] = [.. existing, fieldError];
            return;
        }

        fieldErrors[field] = [fieldError];
    }

    // The framework hands over a key and a text, with no code and no exception, so telling a syntax error from a field
    // error depends on the wording of its text.
    private static string FieldOf(string key, string text)
    {
        if (key.Length == 0 || key == "$" || IsSyntaxError(key, text))
        {
            return string.Empty;
        }

        if (key.StartsWith("$.", StringComparison.Ordinal))
        {
            return key[2..];
        }

        return key;
    }

    private static bool IsSyntaxError(string key, string text)
    {
        if (key[0] != '$')
        {
            return false;
        }

        if (text.StartsWith(ConversionFailure, StringComparison.Ordinal))
        {
            return false;
        }

        return text.Contains(ParserPosition, StringComparison.Ordinal);
    }
}
