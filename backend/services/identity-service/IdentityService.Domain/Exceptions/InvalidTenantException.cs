namespace IdentityService.Domain.Exceptions;

/// <summary>
/// A Tenant invariant was violated (name required). Message is
/// user-presentable - the Api's global exception handler maps this to a
/// 400 Problem Details response using Code as the title and Message as
/// the detail.
/// </summary>
public class InvalidTenantException : BusinessException
{
    public InvalidTenantException(string message)
        : base("Tenant.Invalid", message)
    {
    }
}
