namespace ServicesService.Domain.Exceptions;

public class InvalidServiceException : BusinessException
{
    public InvalidServiceException(string message)
        : base("Service.Invalid", message)
    {
    }
}
