namespace Admin.SharedKernel.ValueObjects;

public sealed class ParseResult<T>
{
    private readonly T? _value;

    private ParseResult(T? value, string error)
    {
        _value = value;
        Error = error;
    }

    public bool IsSuccess => Error.Length == 0;

    public bool IsFailure => !IsSuccess;

    public string Error { get; }

    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot access the value of a failed result.");

    public static ParseResult<T> Success(T value) => new(value, string.Empty);

    public static ParseResult<T> Failure(string error)
    {
        ArgumentException.ThrowIfNullOrEmpty(error);
        return new ParseResult<T>(default, error);
    }
}
