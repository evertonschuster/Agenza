namespace Admin.SharedKernel.ValueObjects;

public interface IDateValueObject<TSelf>
    where TSelf : class, IDateValueObject<TSelf>
{
    DateOnly Value { get; }

    static abstract ParseResult<TSelf> Create(DateOnly value, DateOnly today);

    static abstract TSelf Restore(DateOnly value);
}
