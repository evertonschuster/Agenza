namespace Admin.SharedKernel.ValueObjects;

public interface IObjectValueObject<TSelf>
    where TSelf : class, IObjectValueObject<TSelf>
{
}
