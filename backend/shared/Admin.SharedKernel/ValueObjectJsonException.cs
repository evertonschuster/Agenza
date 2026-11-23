using System.Text.Json;

namespace Admin.SharedKernel;

public sealed class ValueObjectJsonException(string message) : JsonException(message);
