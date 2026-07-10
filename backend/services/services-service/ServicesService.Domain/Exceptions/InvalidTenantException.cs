namespace ServicesService.Domain.Exceptions;

public class InvalidTenantException : BusinessException
{
    public InvalidTenantException()
        : base("InvalidTenant", "A tenant ID is required.")
    {
    }
}
