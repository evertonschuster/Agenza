namespace ServicesService.Application.Exceptions;

/// <summary>
/// Another tag in the same tenant already uses this name
/// (case-insensitive). Maps to 409 Conflict.
/// </summary>
public class DuplicateTagNameException : Exception
{
    public DuplicateTagNameException(string name)
        : base($"A tag named '{name}' already exists.")
    {
    }
}
