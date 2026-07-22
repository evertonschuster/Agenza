namespace ServicesService.Application.Abstractions;

public class PersistenceResult
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public PersistenceError Error { get; }

    protected internal PersistenceResult(bool isSuccess, PersistenceError error)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public static PersistenceResult Success() => new(true, default);

    public static PersistenceResult Failure(PersistenceError error) => new(false, error);

    public static PersistenceResult<TValue> Success<TValue>(TValue value) => new(value, true, default);

    public static PersistenceResult<TValue> Failure<TValue>(PersistenceError error) => new(default, false, error);
}

public sealed class PersistenceResult<TValue> : PersistenceResult
{
    private readonly TValue? _value;

    internal PersistenceResult(TValue? value, bool isSuccess, PersistenceError error)
        : base(isSuccess, error)
    {
        _value = value;
    }

    public TValue Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot access the value of a failed result.");
}
