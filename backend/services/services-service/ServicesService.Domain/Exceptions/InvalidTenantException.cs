namespace ServicesService.Domain.Exceptions;

public class InvalidTenantException : BusinessException
{
    public InvalidTenantException()
        : base("InvalidTenant", "Um id de tenant é obrigatório.")
    {
    }
}
