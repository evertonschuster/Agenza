namespace ServicesService.Domain.Exceptions;

/// <summary>
/// A Tag invariant was violated (name/color/description rules from
/// docs/DOMAIN.md). Message is user-presentable - the Api maps this to
/// a 400 Problem Details response.
/// </summary>
public class InvalidTagException : Exception
{
    public InvalidTagException(string message)
        : base(message)
    {
    }
}
