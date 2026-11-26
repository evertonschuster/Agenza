namespace Admin.SharedKernel.ValueObjects;

public interface IObjectValueObject<TSelf, TInput>
    where TSelf : class, IObjectValueObject<TSelf, TInput>
{
    static abstract ParseResult<TSelf> Create(TInput input);

    static abstract TInput ToInput(TSelf value);
}
