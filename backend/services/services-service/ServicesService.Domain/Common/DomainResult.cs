namespace ServicesService.Domain.Common;

public class DomainResult
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public DomainError Error { get; }

    protected internal DomainResult(bool isSuccess, DomainError error)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public static DomainResult Success() => new(true, default);

    public static DomainResult Failure(DomainError error) => new(false, error);

    public static DomainResult<TValue> Success<TValue>(TValue value) => new(value, true, default);

    public static DomainResult<TValue> Failure<TValue>(DomainError error) => new(default, false, error);
}

public sealed class DomainResult<TValue> : DomainResult
{
    private readonly TValue? _value;

    internal DomainResult(TValue? value, bool isSuccess, DomainError error)
        : base(isSuccess, error)
    {
        _value = value;
    }

    public TValue Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot access the value of a failed result.");
}
