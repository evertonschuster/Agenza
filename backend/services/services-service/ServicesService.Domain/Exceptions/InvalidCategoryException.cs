namespace ServicesService.Domain.Exceptions;

public class InvalidCategoryException : BusinessException
{
    public InvalidCategoryException(string message)
        : base("Category.Invalid", message)
    {
    }
}
