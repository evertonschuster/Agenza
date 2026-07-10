namespace ServicesService.Domain.Exceptions;

public class InvalidTagException : BusinessException
{
    public InvalidTagException(string message)
        : base("Tag.Invalid", message)
    {
    }
}
