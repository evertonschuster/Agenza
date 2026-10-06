namespace Admin.SharedKernel.ValueObjects;

public interface IStringValueObject<TSelf>
    where TSelf : class, IStringValueObject<TSelf>
{
    string Value { get; }

    static abstract ParseResult<TSelf> Create(string? raw);

    static abstract TSelf Restore(string value);
}
