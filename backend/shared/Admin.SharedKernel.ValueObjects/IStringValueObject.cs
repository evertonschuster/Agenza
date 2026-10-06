namespace Admin.SharedKernel.ValueObjects;

public interface IStringValueObject<TSelf>
    where TSelf : class, IStringValueObject<TSelf>
{
    static virtual bool BlankIsAbsent => true;

    string Value { get; }

    static abstract ParseResult<TSelf> Create(string? raw);

    static abstract TSelf Restore(string value);
}
