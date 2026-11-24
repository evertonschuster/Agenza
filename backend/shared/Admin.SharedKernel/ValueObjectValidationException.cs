using System.Text.Json;

namespace Admin.SharedKernel;

public sealed class ValueObjectValidationException(string message) : JsonException(message)
{
    public string ValidationMessage { get; } = message;
}
