namespace Admin.SharedKernel.ValueObjects;

public interface IStringValueObject<TSelf> : IParsable<TSelf>
    where TSelf : class, IStringValueObject<TSelf>
{
    static abstract string InvalidMessage { get; }

    string Value { get; }

    static abstract TSelf Restore(string value);
}
