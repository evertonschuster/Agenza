namespace ServicesService.Domain.Exceptions;

/// <summary>
/// A Tag invariant was violated (name/color/description rules from
/// docs/DOMAIN.md). Message is user-presentable - the Api's global
/// exception handler maps this to a 400 Problem Details response using
/// Code as the title and Message as the detail.
/// </summary>
public class InvalidTagException : BusinessException
{
    public InvalidTagException(string message)
        : base("Tag.Invalid", message)
    {
    }
}
