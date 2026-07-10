namespace ServicesService.Domain.Exceptions;

public class InvalidServiceOfferingException : BusinessException
{
    public InvalidServiceOfferingException(string message)
        : base("ServiceOffering.Invalid", message)
    {
    }
}
