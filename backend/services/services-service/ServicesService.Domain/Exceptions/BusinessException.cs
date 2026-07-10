namespace ServicesService.Domain.Exceptions;

/// <summary>
/// Base for every exception a Domain entity/value object throws for its
/// own invariant violations. Carries a stable Code alongside the
/// user-presentable Message so the Api's global exception handler can
/// map it to a Problem Details response without every command handler
/// writing its own try/catch (docs/adr/0006). Not shared across
/// services (Domain has zero project references, same reasoning as
/// BaseEntity) - each service's Domain owns its own copy.
/// </summary>
public abstract class BusinessException : Exception
{
    public string Code { get; }

    protected BusinessException(string code, string message)
        : base(message)
    {
        Code = code;
    }
}
