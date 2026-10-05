using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Admin.SharedKernel.AspNetCore;

public static class ModelStateErrorMapper
{
    private const string ConversionFailure = "The JSON value could not be converted";
    private const string RequiredSuffix = "field is required.";
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
            "Validation.Failed",
            message,
            fieldErrors.ToDictionary(pair => pair.Key, pair => (IReadOnlyList<FieldError>)pair.Value));
    }

    // The framework hands over a key and English text, no code and no exception, so the cases below depend on its wording.
    private static (string Field, FieldError Error) Classify(string key, string text)
    {
        var field = ToField(key);

        if (text.StartsWith(ConversionFailure, StringComparison.Ordinal))
        {
            return (field, RequestErrors.InvalidValue);
        }

        if (text.EndsWith(RequiredSuffix, StringComparison.Ordinal))
        {
            return (field, RequestErrors.FieldRequired);
        }

        if (key.Length == 0)
        {
            return (string.Empty, RequestErrors.Invalid);
        }

        // System.Text.Json writes the parser position into its own messages; a converter's own failure has none.
        if (key[0] == '$' && text.Contains(ParserPosition, StringComparison.Ordinal))
        {
            return (string.Empty, RequestErrors.Invalid);
        }

        return (field, RequestErrors.InvalidValue);
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
