using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Admin.SharedKernel.AspNetCore;

public static class ModelStateErrorMapper
{
    private const string ValidationFailed = "Validation.Failed";
    private const string ConversionFailure = "The JSON value could not be converted";
    private const string ParserPosition = "LineNumber:";

    public static Error ToError(ModelStateDictionary modelState, IReadOnlyCollection<string> bodyParameterNames)
    {
        var failed = modelState
            .Where(entry => entry.Value is { Errors.Count: > 0 })
            .Select(entry => (entry.Key, Errors: entry.Value!.Errors))
            .ToList();

        // A failed body read also marks the whole body parameter as missing; that entry only repeats the real one.
        if (failed.Count > 1)
        {
            failed.RemoveAll(entry => bodyParameterNames.Contains(entry.Key));
        }

        var fieldErrors = new Dictionary<string, List<FieldError>>();
        foreach (var (key, errors) in failed)
        {
            foreach (var modelError in errors)
            {
                var (field, fieldError) = Classify(key, modelError.ErrorMessage);
                if (!fieldErrors.TryGetValue(field, out var list))
                {
                    list = [];
                    fieldErrors[field] = list;
                }

                list.Add(fieldError);
            }
        }

        var message = string.Join(" ", fieldErrors.Values.SelectMany(list => list).Select(item => item.Message));
        return Error.Validation(
            ValidationFailed,
            message,
            fieldErrors.ToDictionary(pair => pair.Key, pair => (IReadOnlyList<FieldError>)pair.Value));
    }

    // The framework hands over a key and a text, with no code and no exception, so telling a syntax error from a field
    // error depends on the wording of its text.
    private static (string Field, FieldError Error) Classify(string key, string text)
    {
        var bindingError = new FieldError(ValidationFailed, text);

        if (key.Length == 0 || IsSyntaxError(key, text))
        {
            return (string.Empty, bindingError);
        }

        return (ToField(key), bindingError);
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

    private static string ToField(string key)
    {
        if (key == "$")
        {
            return string.Empty;
        }

        if (key.StartsWith("$.", StringComparison.Ordinal))
        {
            return key[2..];
        }

        return key;
    }
}
